// app/api/admin/staff-offers/[id]/export/route.js - one promo's products as
// .xlsx, in the upload template's layout (lib/staffOfferSheet.js).
import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { handleRouteError } from "@/lib/adminForm";
import { OFFER_COLUMNS, loadPromo, toOffer } from "@/lib/adminStaffOffers";
import { buildPromoExport, xlsxResponse } from "@/lib/staffOfferSheet";

export const GET = requireAuth(
  async (_request, { params }) => {
    try {
      const { id } = await params;
      const { promo, offers } = await withConnection(async (connection) => {
        const promo = await loadPromo(connection, id);
        const [rows] = await connection.execute(
          `SELECT ${OFFER_COLUMNS} FROM staff_offer_prices o
           WHERE o.promo_id = ?
           ORDER BY o.is_active DESC, o.product_code ASC, o.id DESC`,
          [promo.id],
        );
        return { promo, offers: rows.map(toOffer) };
      });

      return xlsxResponse(
        await buildPromoExport(promo, offers),
        `${promo.name}.xlsx`,
      );
    } catch (error) {
      return handleRouteError(error, "Error exporting the promo");
    }
  },
  { roles: ["admin"] },
);
