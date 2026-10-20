// app/api/admin/staff-offers/[id]/products/[offerId]/route.js - turn one
// product row of a promo off or back on: { isActive, reason?,
// confirmOverlap? }. Prices never change in place (lib/adminStaffOffers.js).
import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import { RouteError, handleRouteError, readReason } from "@/lib/adminForm";
import {
  assertNoOverlap,
  findOverlaps,
  hasActiveCode,
  loadOffer,
  loadPromo,
  promoTarget,
} from "@/lib/adminStaffOffers";

export const PATCH = requireAuth(
  async (request, { params, user: admin }) => {
    try {
      const { id, offerId } = await params;
      const body = await request.json();
      if (typeof body.isActive !== "boolean") {
        throw new RouteError(400, "isActive must be true or false");
      }
      const reason = readReason(body.reason);

      const { promo, message } = await withTransaction(async (connection) => {
        const promo = await loadPromo(connection, id, { lock: true });
        const offer = await loadOffer(connection, promo.id, offerId);
        if (offer.isActive === body.isActive) {
          throw new RouteError(
            400,
            `It's already ${offer.isActive ? "active" : "inactive"}`,
          );
        }

        if (body.isActive) {
          if (promo.phase === "over") {
            throw new RouteError(400, "This promo has ended");
          }
          if (await hasActiveCode(connection, promo.id, offer.productCode, offer.id)) {
            throw new RouteError(
              409,
              `${offer.productCode} is already active in this promo at another price - deactivate that one first`,
            );
          }
          if (promo.isActive) {
            assertNoOverlap(
              await findOverlaps(connection, {
                promoId: promo.id,
                window: { startsAt: promo.startsAt, endsAt: promo.endsAt },
                codes: [offer.productCode],
              }),
              body.confirmOverlap,
            );
          }
        }

        await connection.execute(
          `UPDATE staff_offer_prices SET is_active = ? WHERE id = ?`,
          [body.isActive ? 1 : 0, offer.id],
        );

        await writeAdminAudit(connection, {
          admin,
          action: body.isActive ? "offer.reactivate" : "offer.deactivate",
          ...promoTarget(promo),
          reason,
          before: {
            offer_id: offer.id,
            product_code: offer.productCode,
            offer_price: offer.offerPrice,
            is_active: offer.isActive,
          },
          after: { offer_id: offer.id, is_active: body.isActive },
        });

        return {
          promo: await loadPromo(connection, promo.id),
          message: `${offer.productCode} ${body.isActive ? "reactivated" : "deactivated"}.`,
        };
      });

      return Response.json({ message, promo });
    } catch (error) {
      return handleRouteError(error, "Error saving the product");
    }
  },
  { roles: ["admin"] },
);
