// app/api/admin/staff-offers/[id]/products/route.js - a promo's product
// rows. GET lists them (paginated; search by code, status filter); POST adds
// one: { productCode, offerPrice, confirmOverlap?, reason? }.
// Rules: lib/adminStaffOffers.js.
import { withConnection, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import { RouteError, handleRouteError, readReason } from "@/lib/adminForm";
import {
  OFFER_COLUMNS,
  assertNoOverlap,
  findOverlaps,
  hasActiveCode,
  insertOffers,
  loadPromo,
  promoTarget,
  readOfferPrice,
  readProductCode,
  toOffer,
} from "@/lib/adminStaffOffers";

const STATUS_CLAUSES = {
  active: `o.is_active = 1`,
  inactive: `o.is_active = 0`,
};

export const GET = requireAuth(
  async (request, { params }) => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(request.url);

      const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("pageSize"), 10) || 10),
      );
      const offset = (page - 1) * pageSize;

      const search = searchParams.get("search") || "";
      const status = searchParams.get("status") || "";

      const whereClauses = [`o.promo_id = ?`];
      const queryParams = [id];
      if (search) {
        whereClauses.push(`o.product_code LIKE ?`);
        queryParams.push(`%${search}%`);
      }
      if (STATUS_CLAUSES[status]) whereClauses.push(STATUS_CLAUSES[status]);
      const whereSql = ` WHERE ${whereClauses.join(" AND ")}`;

      // An active row is "overlapping" when another active promo that hasn't
      // ended offers the same code during this promo's window
      const overlapSql = `(SELECT p2.name FROM staff_offer_prices o2
          JOIN staff_offer_promos p2 ON p2.id = o2.promo_id
          JOIN staff_offer_promos p ON p.id = o.promo_id
          WHERE o.is_active = 1 AND o2.product_code = o.product_code
            AND o2.promo_id <> o.promo_id AND o2.is_active = 1
            AND p2.is_active = 1 AND p2.ends_at >= NOW()
            AND p2.starts_at <= p.ends_at AND p2.ends_at >= p.starts_at
          ORDER BY o2.created_at DESC LIMIT 1) AS overlapPromo`;

      // pageSize/offset are clamped integers (see purchaseshistorydata)
      const { rows, total } = await withConnection(async (connection) => {
        await loadPromo(connection, id);
        const [rows] = await connection.execute(
          `SELECT ${OFFER_COLUMNS}, ${overlapSql}
           FROM staff_offer_prices o${whereSql}
           ORDER BY o.is_active DESC, o.product_code ASC, o.id DESC
           LIMIT ${pageSize} OFFSET ${offset}`,
          queryParams,
        );
        const [countResult] = await connection.execute(
          `SELECT COUNT(*) AS count FROM staff_offer_prices o${whereSql}`,
          queryParams,
        );
        return { rows, total: countResult[0].count };
      });

      return Response.json({
        data: rows.map((row) => ({
          ...toOffer(row),
          overlapPromo: row.overlapPromo,
        })),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      });
    } catch (error) {
      return handleRouteError(error, "Error loading the promo's products");
    }
  },
  { roles: ["admin"] },
);

export const POST = requireAuth(
  async (request, { params, user: admin }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const productCode = readProductCode(body.productCode);
      const offerPrice = readOfferPrice(body.offerPrice);
      const reason = readReason(body.reason);

      const promo = await withTransaction(async (connection) => {
        const current = await loadPromo(connection, id, { lock: true });
        if (current.phase === "over") {
          throw new RouteError(
            400,
            "This promo has ended - products can't be added to it",
          );
        }
        if (await hasActiveCode(connection, current.id, productCode)) {
          throw new RouteError(
            409,
            `${productCode} is already in this promo. To change its price, deactivate it and add it again.`,
          );
        }
        if (current.isActive) {
          assertNoOverlap(
            await findOverlaps(connection, {
              promoId: current.id,
              window: { startsAt: current.startsAt, endsAt: current.endsAt },
              codes: [productCode],
            }),
            body.confirmOverlap,
          );
        }

        await insertOffers(connection, current.id, [
          { productCode, offerPrice },
        ]);
        const updated = await loadPromo(connection, current.id);

        await writeAdminAudit(connection, {
          admin,
          action: "offer.add",
          ...promoTarget(updated),
          reason,
          after: { product_code: productCode, offer_price: offerPrice },
        });
        return updated;
      });

      return Response.json(
        { message: `${productCode} added.`, promo },
        { status: 201 },
      );
    } catch (error) {
      return handleRouteError(error, "Error adding the product");
    }
  },
  { roles: ["admin"] },
);
