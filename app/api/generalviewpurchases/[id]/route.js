import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

export const GET = requireAuth(async (_req, { params }) => {
  try {
    const { id } = await params;

    const responseData = await withConnection(async (connection) => {
      //Create main purchasesinfo promise
      const purchasePromise = connection.execute(
        `SELECT * FROM purchasesinfo WHERE id= ?`,
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
    onlinePrice
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
