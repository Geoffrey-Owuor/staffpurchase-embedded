import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

export const GET = requireAuth(async (_req, { params, user }) => {
  try {
    const { id } = await params;

    const responseData = await withConnection(async (connection) => {
      //Create main purchasesinfo promise (+ the extended credit window's
      // name, for the badge)
      const purchasePromise = connection.execute(
        `SELECT p.*, w.name AS credit_extension_name
         FROM purchasesinfo p
         LEFT JOIN credit_extension_windows w ON w.id = p.credit_extension_id
         WHERE p.id = ?`,
        [id],
      );

      //The purchase_products promise
      const productsPromise = connection.execute(
        `
    SELECT
    itemName,
    itemStatus,
    productPolicy,
    productCode,
    priceCode,
    tdPrice,
    discountRate,
    discountedValue,
    tradePrice,
    retailPrice,
    onlinePrice,
    staffOfferPrice,
    staffOfferId
    FROM purchase_products
    WHERE purchase_id = ?
      `,
        [id],
      );

      // Execute both queries in parallel using promise.all
      const [[purchaseRows], [productRows]] = await Promise.all([
        purchasePromise,
        productsPromise,
      ]);

      if (purchaseRows.length === 0) {
        return null;
      }
      const purchaseDetails = purchaseRows[0];

      // Staff only ever see their own requests (answered as "not found" so
      // this doesn't confirm another request exists). Approvers and admin
      // see every request, as their tables do.
      if (user.role === "staff" && purchaseDetails.user_id !== user.id) {
        return null;
      }

      //Combine results into a single object
      return {
        ...purchaseDetails,
        products: productRows,
      };
    });

    if (!responseData) {
      return Response.json({ error: "Purchase not found" }, { status: 404 });
    }

    return Response.json(responseData);
  } catch (error) {
    console.error("Failed: ", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
