// app/api/admin/staff-offers/route.js - Staff Offer promos, managed from
// /dashboard/admin/staff-offers. GET lists promos (paginated, filterable);
// POST creates one, optionally copying another promo's active products
// (Duplicate). Rules: lib/adminStaffOffers.js.
import { withConnection, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import {
  RouteError,
  dbNow,
  handleRouteError,
  readReason,
} from "@/lib/adminForm";
import {
  PROMO_COLUMNS,
  PROMO_ORDER,
  PROMO_STATUS_SQL,
  assertNoOverlap,
  findOverlaps,
  insertOffers,
  loadPromo,
  promoSnapshot,
  promoTarget,
  readPromoName,
  readWindow,
  toPromo,
  windowColumns,
} from "@/lib/adminStaffOffers";

export const GET = requireAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);

      const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("pageSize"), 10) || 10),
      );
      const offset = (page - 1) * pageSize;

      const search = searchParams.get("search") || "";
      const status = searchParams.get("status") || "";
      const productCode = searchParams.get("productCode") || "";

      const whereClauses = [];
      const params = [];

      if (search) {
        whereClauses.push(`p.name LIKE ?`);
        params.push(`%${search}%`);
      }
      if (PROMO_STATUS_SQL[status]) {
        whereClauses.push(`(${PROMO_STATUS_SQL[status]})`);
      }
      if (productCode) {
        whereClauses.push(
          `EXISTS (SELECT 1 FROM staff_offer_prices o
                   WHERE o.promo_id = p.id AND o.product_code LIKE ?)`,
        );
        params.push(`%${productCode}%`);
      }

      const whereSql =
        whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

      // pageSize/offset are clamped integers (see purchaseshistorydata for
      // why they're inlined rather than bound).
      const { rows, total } = await withConnection(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT ${PROMO_COLUMNS} FROM staff_offer_promos p${whereSql}
           ORDER BY ${PROMO_ORDER}
           LIMIT ${pageSize} OFFSET ${offset}`,
          params,
        );
        const [countResult] = await connection.execute(
          `SELECT COUNT(*) AS count FROM staff_offer_promos p${whereSql}`,
          params,
        );
        return { rows, total: countResult[0].count };
      });

      return Response.json({
        data: rows.map(toPromo),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      });
    } catch (error) {
      return handleRouteError(error, "Error loading promos");
    }
  },
  { roles: ["admin"] },
);

// Body: { name, startsAt, endsAt, copyFromId?, confirmOverlap?, reason? }.
// copyFromId copies that promo's ACTIVE products at their prices (as new
// rows - the originals stay with the purchases that used them).
export const POST = requireAuth(
  async (request, { user: admin }) => {
    try {
      const body = await request.json();
      const name = readPromoName(body.name);
      const reason = readReason(body.reason);
      const copyFromId = body.copyFromId ? parseInt(body.copyFromId, 10) : null;

      const promo = await withTransaction(async (connection) => {
        const window = readWindow(body, await dbNow(connection));

        let source = null;
        let offers = [];
        if (copyFromId) {
          source = await loadPromo(connection, copyFromId);
          const [rows] = await connection.execute(
            `SELECT product_code AS productCode, offer_price AS offerPrice
             FROM staff_offer_prices WHERE promo_id = ? AND is_active = 1
             ORDER BY product_code`,
            [source.id],
          );
          offers = rows;
          assertNoOverlap(
            await findOverlaps(connection, {
              promoId: 0,
              window,
              codes: offers.map((o) => o.productCode),
            }),
            body.confirmOverlap,
          );
        }

        const columns = windowColumns(window);
        const [result] = await connection.execute(
          `INSERT INTO staff_offer_promos
             (name, starts_at, ends_at, is_active, created_by, created_by_name)
           VALUES (?, ?, ?, 1, ?, ?)`,
          [
            name,
            columns.starts_at,
            columns.ends_at,
            admin.id,
            admin.name ?? admin.email,
          ],
        );
        await insertOffers(connection, result.insertId, offers);
        const created = await loadPromo(connection, result.insertId);

        await writeAdminAudit(connection, {
          admin,
          action: "promo.create",
          ...promoTarget(created),
          reason,
          after: {
            ...promoSnapshot(created),
            ...(source
              ? { copied_from: `promo:${source.id} (${source.name})` }
              : {}),
          },
        });
        return created;
      });

      return Response.json(
        {
          message: copyFromId
            ? `Promo created with ${promo.productCount} product${promo.productCount === 1 ? "" : "s"}.`
            : "Promo created.",
          promo,
        },
        { status: 201 },
      );
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        return handleRouteError(
          new RouteError(409, "A promo with that name already exists"),
        );
      }
      return handleRouteError(error, "Error creating the promo");
    }
  },
  { roles: ["admin"] },
);
