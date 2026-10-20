// app/api/admin/staff-offers/template/route.js - the blank Staff Offers
// upload template (lib/staffOfferSheet.js).
import { requireAuth } from "@/lib/apiAuth";
import { handleRouteError } from "@/lib/adminForm";
import { buildTemplate, xlsxResponse } from "@/lib/staffOfferSheet";

export const GET = requireAuth(
  async () => {
    try {
      return xlsxResponse(await buildTemplate(), "staff_offers_template.xlsx");
    } catch (error) {
      return handleRouteError(error, "Error building the template");
    }
  },
  { roles: ["admin"] },
);
