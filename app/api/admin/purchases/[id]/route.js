// app/api/admin/purchases/[id]/route.js - the admin request editor.
// Separate from generaleditpurchases on purpose: that route is the approval
// workflow (per-role field whitelists, stage locks, workflow emails); this
// one is an audited override that can touch any stage's data and products,
// but never marks a stage approved - it can only reopen stages to pending.
import { withConnection, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import {
  loadPurchase,
  purchaseSnapshot,
  purchaseVersion,
  toDateOnly,
} from "@/lib/adminPurchases";
import { StaffOfferError, verifyStaffOffers } from "@/lib/staffOffers";
import { adminChangeEmailHandler } from "@/lib/Email/adminChangeEmailHandler";
import { PRICE_CODES, STAFF_OFFER_CODE } from "@/utils/Pricing/priceCodes";
import { approverColumns, stagesFrom } from "@/utils/Approvals/approvalStages";
import { REASON_MAX_LENGTH } from "@/utils/Admin/adminConstants";

class RouteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const PAYMENT_TERMS = ["CREDIT", "CASH", "CASH AND CREDIT"];
const ITEM_STATUSES = ["New", "RHD2"];
const VALID_PRICE_CODES = [...PRICE_CODES, "MANUAL"];
// Fetched bases that are never discounted (only TRADE / MANUAL take one).
const UNDISCOUNTED_CODES = [STAFF_OFFER_CODE, "RTLRRP", "ONLINE"];

// Every purchasesinfo column the admin editor may write, with how to read
// it. Approval statuses and approver sign-offs are deliberately absent -
// those only change through `reopenFromStage`.
const EDITABLE_FIELDS = {
  staffName: { label: "Staff name", required: true, max: 255 },
  payrollNo: { label: "Payroll no", required: true, max: 55 },
  department: { label: "Department", required: true, max: 55 },
  employee_payment_terms: {
    label: "Payment terms",
    required: true,
    oneOf: PAYMENT_TERMS,
  },
  invoicing_location: { label: "Invoicing location", required: true, max: 255 },
  delivery_details: { label: "Other details", required: true },
  mpesa_code: { label: "Mpesa code", max: 255 },
  user_credit_period: { label: "Credit period", type: "int" },
  one_third_rule: { label: "1/3 rule" },
  is_employed: { label: "Employment status", max: 50 },
  on_probation: { label: "On probation", max: 50 },
  hr_comments: { label: "HR comments" },
  credit_period: { label: "Credit period given" },
  purchase_history_comments: { label: "Purchase history comments" },
  pending_invoices: { label: "Pending invoices" },
  invoice_date: { label: "Invoice date", type: "date" },
  invoice_number: { label: "Invoice number", max: 255 },
  invoice_amount: { label: "Invoice amount", type: "decimal" },
  payment_reference: { label: "Payment reference" },
};

const parseNumber = (value) =>
  value === "" || value == null ? null : parseFloat(value);

const sameNumber = (a, b) => {
  const x = parseNumber(a);
  const y = parseNumber(b);
  if (x == null || y == null) return x == null && y == null;
  return Math.abs(x - y) < 0.005;
};

// A submitted field value, normalized and validated (null = empty).
function readField(key, raw) {
  const spec = EDITABLE_FIELDS[key];
  const text = raw == null ? "" : String(raw).trim();

  if (!text) {
    if (spec.required) throw new RouteError(400, `${spec.label} is required`);
    return null;
  }

  switch (spec.type) {
    case "int": {
      const n = Number(text);
      if (!Number.isInteger(n) || n < 0) {
        throw new RouteError(400, `${spec.label} must be a whole number`);
      }
      return n;
    }
    case "decimal": {
      const n = Number(text);
      if (!Number.isFinite(n) || n < 0) {
        throw new RouteError(400, `${spec.label} must be a valid amount`);
      }
      return Math.round(n * 100) / 100;
    }
    case "date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw new RouteError(400, `${spec.label} must be a date`);
      }
      return text;
  }

  if (spec.oneOf && !spec.oneOf.includes(text)) {
    throw new RouteError(400, `${spec.label} is not a valid option`);
  }
  if (spec.max && text.length > spec.max) {
    throw new RouteError(400, `${spec.label} is too long`);
  }
  return text;
}

// The stored value in the same shape readField produces, for comparison.
function storedField(key, value) {
  if (value == null || value === "") return null;
  switch (EDITABLE_FIELDS[key].type) {
    case "int":
      return Number(value);
    case "decimal":
      return Math.round(parseFloat(value) * 100) / 100;
    case "date":
      return toDateOnly(value);
    default:
      return String(value);
  }
}

// An existing line item the editor sent back untouched keeps its stored row
// exactly (fetched prices, policy, Staff Offer) - even if the offer it was
// priced at has since ended, as on the CC edit path.
const isUnchangedProduct = (submitted, stored) =>
  (submitted.productCode?.trim() ?? "") === stored.productCode &&
  (submitted.itemName ?? "") === (stored.itemName ?? "") &&
  (submitted.itemStatus ?? "") === (stored.itemStatus ?? "") &&
  submitted.priceCode === stored.priceCode &&
  sameNumber(submitted.tdPrice, stored.tdPrice) &&
  sameNumber(submitted.discountRate, stored.discountRate);

function readChangedProduct(product, number) {
  const label = `Product ${number}`;
  const productCode = product.productCode?.trim() ?? "";
  const itemName = product.itemName?.trim() ?? "";
  if (!productCode)
    throw new RouteError(400, `${label}: product code is required`);
  if (!itemName) throw new RouteError(400, `${label}: item name is required`);
  if (!ITEM_STATUSES.includes(product.itemStatus)) {
    throw new RouteError(400, `${label}: choose New or RHD2`);
  }
  if (!VALID_PRICE_CODES.includes(product.priceCode)) {
    throw new RouteError(
      400,
      `${label}: fetch the prices or enter a manual price`,
    );
  }

  const tdPrice = parseNumber(product.tdPrice);
  const discountRate = parseNumber(product.discountRate);
  if (!(tdPrice > 0)) {
    throw new RouteError(400, `${label}: enter a valid price`);
  }
  if (!(discountRate >= 0 && discountRate <= 100)) {
    throw new RouteError(
      400,
      `${label}: enter a discount rate between 0 and 100`,
    );
  }
  if (UNDISCOUNTED_CODES.includes(product.priceCode) && discountRate !== 0) {
    throw new RouteError(
      400,
      `${label}: only a Trade or manual price can carry a discount`,
    );
  }

  return {
    itemName,
    itemStatus: product.itemStatus,
    productPolicy: product.productPolicy?.trim() || null,
    productCode,
    priceCode: product.priceCode,
    tdPrice,
    discountRate,
    // Always recomputed here, never taken from the client
    discountedValue: (tdPrice * (1 - discountRate / 100)).toFixed(2),
    tradePrice: parseNumber(product.tradePrice) ?? 0,
    retailPrice: parseNumber(product.retailPrice) ?? 0,
    onlinePrice: parseNumber(product.onlinePrice) ?? 0,
    // Re-checked against the DB below (verifyStaffOffers)
    staffOfferId: product.staffOfferId,
  };
}

// Builds the line items to store. Returns null when nothing changed (so the
// stored rows, and their ids, are left alone).
async function buildProductRows(connection, submittedProducts, storedProducts) {
  if (!Array.isArray(submittedProducts) || submittedProducts.length === 0) {
    throw new RouteError(400, "A request needs at least one product");
  }

  const storedById = new Map(storedProducts.map((p) => [p.id, p]));
  const usedIds = new Set();
  const rows = [];
  const changed = [];

  submittedProducts.forEach((product, index) => {
    const stored = storedById.get(product.id);
    if (
      stored &&
      !usedIds.has(stored.id) &&
      isUnchangedProduct(product, stored)
    ) {
      usedIds.add(stored.id);
      const { id, ...storedRow } = stored;
      rows.push(storedRow);
      return;
    }
    const row = readChangedProduct(product, index + 1);
    changed.push({ index: rows.length, row });
    rows.push(row);
  });

  const sameOrder =
    changed.length === 0 &&
    rows.length === storedProducts.length &&
    submittedProducts.every((p, i) => p.id === storedProducts[i].id);
  if (sameOrder) return null;

  // STAFFOFFER-priced changed rows must match the offer in force now (409
  // otherwise); for other bases the offer is kept only when it matches.
  const offers = await verifyStaffOffers(
    connection,
    changed.map(({ row }) => row),
  );
  changed.forEach(({ index }, i) => {
    rows[index] = { ...rows[index], ...offers[i] };
  });

  return rows;
}

const responseShape = (loaded) => ({
  purchase: {
    ...loaded.purchase,
    invoice_date: toDateOnly(loaded.purchase.invoice_date),
  },
  products: loaded.products,
  version: purchaseVersion(loaded),
});

export const GET = requireAuth(
  async (_request, { params }) => {
    const { id } = await params;
    const loaded = await withConnection((connection) =>
      loadPurchase(connection, id),
    );
    if (!loaded) {
      return Response.json({ message: "Purchase not found" }, { status: 404 });
    }
    return Response.json(responseShape(loaded));
  },
  { roles: ["admin"] },
);

export const PUT = requireAuth(
  async (request, { params, user: admin }) => {
    const { id } = await params;

    try {
      const body = await request.json();
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason) throw new RouteError(400, "A reason is required");
      if (reason.length > REASON_MAX_LENGTH) {
        throw new RouteError(400, "Reason is too long");
      }
      const reopenFromStage = body.reopenFromStage || null;
      if (reopenFromStage && stagesFrom(reopenFromStage).length === 0) {
        throw new RouteError(400, "Unknown approval stage");
      }

      const result = await withTransaction(async (connection) => {
        const before = await loadPurchase(connection, id, { lock: true });
        if (!before) throw new RouteError(404, "Purchase not found");

        if (body.version !== purchaseVersion(before)) {
          throw new RouteError(
            409,
            "This request changed after you opened it (e.g. an approver acted on it). Reload to see the latest version, then reapply your changes.",
          );
        }

        // 1. Request + stage data fields that actually changed
        const setClauses = [];
        const queryParams = [];
        const submitted = body.purchase ?? {};
        for (const key of Object.keys(EDITABLE_FIELDS)) {
          if (!(key in submitted)) continue;
          const value = readField(key, submitted[key]);
          if (value !== storedField(key, before.purchase[key])) {
            setClauses.push(`${key} = ?`);
            queryParams.push(value);
          }
        }

        // 2. Reopen: the stage and every later one back to pending, their
        // sign-offs cleared. Reopening means the request isn't fully
        // approved any more, so its payment-tracking closure reopens too.
        const reopenedStages = [];
        if (reopenFromStage) {
          const stages = stagesFrom(reopenFromStage);
          if (
            stages.every((s) => before.purchase[s.approvalField] === "pending")
          ) {
            throw new RouteError(
              400,
              "Those approval stages are already pending - nothing to reopen",
            );
          }
          for (const stage of stages) {
            reopenedStages.push(stage.label);
            setClauses.push(`${stage.approvalField} = 'pending'`);
            for (const column of approverColumns(stage.prefix)) {
              setClauses.push(`${column} = NULL`);
            }
          }
          setClauses.push(`request_closure = 'open'`);
        }

        // 3. Line items
        const productRows = await buildProductRows(
          connection,
          body.products,
          before.products,
        );

        if (setClauses.length === 0 && !productRows) {
          throw new RouteError(400, "No changes to save");
        }

        if (setClauses.length > 0) {
          await connection.execute(
            `UPDATE purchasesinfo SET ${setClauses.join(", ")} WHERE id = ?`,
            [...queryParams, id],
          );
        }

        if (productRows) {
          await connection.execute(
            "DELETE FROM purchase_products WHERE purchase_id = ?",
            [id],
          );
          for (const row of productRows) {
            await connection.execute(
              `INSERT INTO purchase_products
                (purchase_id, itemName, itemStatus, productPolicy, productCode, priceCode, tdPrice, discountRate,
                 discountedValue, tradePrice, retailPrice, onlinePrice, staffOfferPrice, staffOfferId)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                row.itemName,
                row.itemStatus,
                row.productPolicy,
                row.productCode,
                row.priceCode,
                row.tdPrice,
                row.discountRate,
                row.discountedValue,
                row.tradePrice,
                row.retailPrice,
                row.onlinePrice,
                row.staffOfferPrice,
                row.staffOfferId,
              ],
            );
          }
        }

        const after = await loadPurchase(connection, id);

        await writeAdminAudit(connection, {
          admin,
          action: "purchase.edit",
          targetType: "purchase",
          targetId: id,
          targetLabel: before.purchase.reference_number,
          reason,
          before: purchaseSnapshot(before),
          after: purchaseSnapshot(after),
        });

        return { after, reopenedStages };
      });

      if (body.notifyRequester) {
        // Fire-and-forget, like the workflow emails
        adminChangeEmailHandler({
          purchase: result.after.purchase,
          action: "edited",
          reason,
          reopenedStages: result.reopenedStages,
        });
      }

      return Response.json({
        message:
          result.reopenedStages.length > 0
            ? `Request updated. Reopened: ${result.reopenedStages.join(", ")}.`
            : "Request updated.",
        ...responseShape(result.after),
      });
    } catch (error) {
      if (error instanceof RouteError || error instanceof StaffOfferError) {
        return Response.json(
          { message: error.message },
          { status: error.status },
        );
      }
      console.error("Admin purchase edit error:", error);
      return Response.json(
        { message: "Error updating the request" },
        { status: 500 },
      );
    }
  },
  { roles: ["admin"] },
);

// Hard delete. The full request and its line items are kept in the audit
// log entry (before_data), so it can be rebuilt by hand if ever needed.
export const DELETE = requireAuth(
  async (request, { params, user: admin }) => {
    const { id } = await params;

    try {
      const body = await request.json().catch(() => ({}));
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason) throw new RouteError(400, "A reason is required");
      if (reason.length > REASON_MAX_LENGTH) {
        throw new RouteError(400, "Reason is too long");
      }

      const before = await withTransaction(async (connection) => {
        const before = await loadPurchase(connection, id, { lock: true });
        if (!before) throw new RouteError(404, "Purchase not found");

        await writeAdminAudit(connection, {
          admin,
          action: "purchase.delete",
          targetType: "purchase",
          targetId: id,
          targetLabel: before.purchase.reference_number,
          reason,
          before: purchaseSnapshot(before),
          after: null,
        });

        await connection.execute(
          "DELETE FROM purchase_products WHERE purchase_id = ?",
          [id],
        );
        await connection.execute("DELETE FROM purchasesinfo WHERE id = ?", [
          id,
        ]);

        return before;
      });

      if (body.notifyRequester) {
        adminChangeEmailHandler({
          purchase: before.purchase,
          action: "deleted",
          reason,
        });
      }

      return Response.json({
        message: `${before.purchase.reference_number} has been deleted.`,
      });
    } catch (error) {
      if (error instanceof RouteError) {
        return Response.json(
          { message: error.message },
          { status: error.status },
        );
      }
      console.error("Admin purchase delete error:", error);
      return Response.json(
        { message: "Error deleting the request" },
        { status: 500 },
      );
    }
  },
  { roles: ["admin"] },
);
