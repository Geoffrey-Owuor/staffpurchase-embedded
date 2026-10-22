import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { ApproversEmailHandler } from "@/lib/Email/ApproversEmailHandler";
import { ccProductsRemovedEmailHandler } from "@/lib/Email/ccProductsRemovedEmailHandler";
import { writeAdminAudit } from "@/lib/adminAudit";
import { REASON_MAX_LENGTH } from "@/utils/Admin/adminConstants";
const parseNumber = (value) => {
  return value === "" || value == null ? null : parseFloat(value);
};

// Thrown for expected business-rule rejections (404/403) so withTransaction
// rolls back automatically while still letting the route return the right status.
class RouteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// A submitted amount equals the stored DECIMAL (both empty counts as equal).
const sameAsStored = (submitted, stored) => {
  const a = parseNumber(submitted);
  const b = parseNumber(stored);
  if (a == null || b == null) return a == null && b == null;
  return Math.abs(a - b) < 0.005;
};

// CC edits products against what was recorded at submission: product codes,
// fetched prices, discount policy and Staff Offer fields are all locked and
// re-written from the DB, as is the item name. CC may set a manual (MANUAL)
// price + discount, e.g. one approved by a product manager, and remove
// products (at least one must stay; nothing can be added). Rows are matched
// to the stored ones by purchase_products.id. Returns the rows to keep and
// the stored rows that were removed. Mirrored client-side by
// ProductPricing's `isCcEdit` and GeneralEditPurchases.
function buildCcProductRows(storedProducts, products) {
  if (products.length === 0) {
    throw new RouteError(
      400,
      "A request needs at least one product - decline it instead",
    );
  }

  const unmatched = [...storedProducts];

  const rows = products.map((product) => {
    const index = unmatched.findIndex((p) => p.id === Number(product.id));
    if (index === -1) {
      throw new RouteError(
        409,
        "Products can't be added or changed at Credit Control approval. Reload the page and try again.",
      );
    }
    const [stored] = unmatched.splice(index, 1);
    const code = stored.productCode;

    if (product.priceCode !== "MANUAL") {
      const unchanged =
        product.priceCode === stored.priceCode &&
        sameAsStored(product.tdPrice, stored.tdPrice) &&
        sameAsStored(product.discountRate, stored.discountRate);
      if (!unchanged) {
        throw new RouteError(
          409,
          "Prices are locked as recorded at submission. Reload the page and try again.",
        );
      }
      return stored;
    }

    const tdPrice = parseNumber(product.tdPrice);
    const discountRate = parseNumber(product.discountRate);
    if (!(tdPrice > 0) || !(discountRate >= 0 && discountRate <= 100)) {
      throw new RouteError(
        400,
        `Enter a valid manual price and discount rate for ${stored.itemName || code}`,
      );
    }

    return {
      ...stored,
      priceCode: "MANUAL",
      tdPrice,
      discountRate,
      discountedValue: (tdPrice * (1 - discountRate / 100)).toFixed(2),
    };
  });

  return { rows, removed: unmatched };
}

const sumValues = (rows) =>
  rows
    .reduce((total, row) => total + (parseFloat(row.discountedValue) || 0), 0)
    .toFixed(2);

// Audit/email copy of a stored row (row ids change on every save).
const withoutId = ({ id, ...row }) => row;

export const PUT = requireAuth(async (request, { params, user }) => {
  const { id } = await params;

  try {
    const result = await withTransaction(async (connection) => {
      //1. Get current state of the purchase before any updates
      const [currentPurchaseRows] = await connection.execute(
        `SELECT * FROM purchasesinfo WHERE id = ? FOR UPDATE`, //Locking the row for update
        [id],
      );
      if (currentPurchaseRows.length === 0) {
        throw new RouteError(404, "Purchase not found");
      }
      const oldData = currentPurchaseRows[0];

      //Approval Check to make sure there is no further update after approval by various roles/approvers

      const approvalFieldForRole = {
        payroll: "Payroll_Approval",
        hr: "HR_Approval",
        cc: "CC_Approval",
        bi: "BI_Approval",
      };

      const roleField = approvalFieldForRole[user.role];

      //Check if current role has an approval field and if the value in the database is already approved
      if (roleField && oldData[roleField] === "approved") {
        //role has already approved, stop any further updates
        throw new RouteError(
          403,
          "Purchase request already approved by your department",
        );
      }

      //Get the full json payload from the frontend
      const newData = await request.json();
      const { products, ...purchaseData } = newData;

      //DYNAMICALLY BUILD SQL QUERY BASED ON USER ROLE

      //Allowed stores fields each role is allowed to update
      const allowedFields = {
        payroll: ["one_third_rule", "Payroll_Approval"],
        hr: ["is_employed", "on_probation", "hr_comments", "HR_Approval"],
        cc: [
          "credit_period",
          "purchase_history_comments",
          "pending_invoices",
          "mpesa_code",
          "CC_Approval",
        ],
        bi: [
          "invoice_date",
          "invoice_number",
          "invoice_amount",
          "payment_reference",
          "invoicing_location",
          "BI_Approval",
        ],
      };

      //Tracking fields that require a numeric database value
      const numericFields = ["user_credit_period"];

      //Check if role has fields it can update
      const fieldsForUpdate = allowedFields[user.role];

      if (!fieldsForUpdate) {
        throw new RouteError(403, "Invalid user role for this action");
      }

      const setClauses = [];
      const queryParams = [];

      //Push valid PurchaseData fields into the setClauses Array and queryParams Array
      for (const field of fieldsForUpdate) {
        if (purchaseData[field] !== undefined) {
          //Making sure the received data does not have any undefined in it and is in purchaseData
          let value = purchaseData[field];

          if (numericFields.includes(field)) {
            value = parseNumber(value);
          }
          setClauses.push(`${field} = ?`);
          queryParams.push(value);
        }
      }

      //Refactored Logic to add Approver Details
      const approverConfig = {
        payroll: {
          approvalField: "Payroll_Approval",
          prefix: "payroll",
        },
        hr: {
          approvalField: "HR_Approval",
          prefix: "hr",
        },
        cc: {
          approvalField: "CC_Approval",
          prefix: "cc",
        },
        bi: {
          approvalField: "BI_Approval",
          prefix: "bi",
        },
      };

      const roleConfig = approverConfig[user.role];
      if (roleConfig && purchaseData[roleConfig.approvalField]) {
        const prefix = roleConfig.prefix;
        const approverName =
          purchaseData[`${prefix}_approver_name`] || user.name;

        //Correctly push clauses and params
        setClauses.push(
          `${prefix}_approver_name = ?`,
          `${prefix}_approver_email = ?`,
          `${prefix}_approver_id = ?`,
          `${prefix}_signature = ?`,
          `${prefix}_approval_date = CURRENT_TIMESTAMP`,
        );
        queryParams.push(approverName, user.email, user.id, user.name);
      }

      //Run the update query after building the clause and params
      if (setClauses.length > 0) {
        const updateQuery = `UPDATE purchasesinfo SET ${setClauses.join(", ")} WHERE id = ?`;
        queryParams.push(id);
        await connection.execute(updateQuery, queryParams);
      }

      //UPDATE THE PRODUCTS TABLE (ONLY WHEN USER IS CC)
      let removedProducts = [];
      let savedProducts = products;
      if (user.role === "cc" && Array.isArray(products)) {
        const [storedProducts] = await connection.execute(
          `SELECT id, itemName, itemStatus, productPolicy, productCode, priceCode, tdPrice, discountRate, discountedValue,
                  tradePrice, retailPrice, onlinePrice, staffOfferPrice, staffOfferId
           FROM purchase_products WHERE purchase_id = ? ORDER BY id FOR UPDATE`,
          [id],
        );
        const { rows, removed } = buildCcProductRows(storedProducts, products);
        savedProducts = rows.map(withoutId);

        // Removing products changes what the requester asked for, so it
        // needs a reason, is audited and emails the requester (below).
        if (removed.length > 0) {
          if (purchaseData.CC_Approval === "declined") {
            throw new RouteError(
              400,
              "Products can't be removed from a request you're declining",
            );
          }
          const reason =
            typeof purchaseData.productRemovalReason === "string"
              ? purchaseData.productRemovalReason.trim()
              : "";
          if (!reason) {
            throw new RouteError(
              400,
              "Give a reason for removing the products",
            );
          }
          if (reason.length > REASON_MAX_LENGTH) {
            throw new RouteError(
              400,
              `The reason must be ${REASON_MAX_LENGTH} characters or fewer`,
            );
          }

          removedProducts = removed.map(withoutId);
          await writeAdminAudit(connection, {
            admin: user,
            action: "purchase.remove_products",
            targetType: "purchase",
            targetId: id,
            targetLabel: oldData.reference_number,
            reason,
            before: {
              products: storedProducts.map(withoutId),
              total_value: sumValues(storedProducts),
            },
            after: {
              products: savedProducts,
              total_value: sumValues(rows),
              removed_products: removedProducts,
            },
          });
        }

        //Delete the existing products for this purchase
        await connection.execute(
          "DELETE FROM purchase_products WHERE purchase_id = ?",
          [id],
        );

        //Insert new products into the table (per product)
        const itemInsertPromises = rows.map((row) => {
          return connection.execute(
            `INSERT INTO purchase_products
          (purchase_id, itemName, itemStatus, productPolicy, productCode, priceCode, tdPrice, discountRate, discountedValue, tradePrice, retailPrice, onlinePrice, staffOfferPrice, staffOfferId)
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
        });

        await Promise.all(itemInsertPromises);
      }

      // Workflow emails list the products as saved, not as the client sent them
      return {
        oldData,
        newData: { ...newData, products: savedProducts },
        removedProducts,
      };
    });
    const { oldData, newData, removedProducts } = result;

    // --- FIRE-AND-FORGET ---
    // Call the handler but DO NOT await it.
    // The code will continue immediately to the return statement.
    ApproversEmailHandler({
      user,
      oldData,
      newData,
    });

    if (removedProducts.length > 0) {
      ccProductsRemovedEmailHandler({
        purchase: oldData,
        removedProducts,
        reason: newData.productRemovalReason.trim(),
        newTotal: sumValues(newData.products),
      });
    }

    return Response.json(
      {
        message:
          "Purchase request has been updated successfully, redirecting...",
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof RouteError) {
      return Response.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error("API Error Updating Purchase: ", error);
    return Response.json(
      { message: "Error Updating Purchase Request" },
      { status: 500 },
    );
  }
});
