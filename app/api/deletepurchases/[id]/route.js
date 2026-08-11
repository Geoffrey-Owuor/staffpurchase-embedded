import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

export const DELETE = requireAuth(
  async (_req, { params, user }) => {
    const { id } = await params;

    if (!id) {
      return Response.json(
        { message: "Purchase Request Id is required" },
        { status: 400 },
      );
    }

    try {
      const result = await withTransaction(async (connection) => {
        //Check if the purchase request exists in the database first (And locking it for update)
        const [checkPurchase] = await connection.execute(
          `SELECT user_id, BI_Approval FROM purchasesinfo WHERE id = ? FOR UPDATE`,
          [id],
        );

        if (checkPurchase.length === 0) {
          return { status: 404, message: "Purchase request not found or is deleted" };
        }

        if (checkPurchase[0].user_id !== user.id) {
          return {
            status: 403,
            message: "You can only delete your own purchase requests",
          };
        }

        const biApproval = checkPurchase[0].BI_Approval === "approved";

        if (biApproval) {
          return {
            status: 400,
            message:
              "Can't delete a purchase request already approved by invoicing",
          };
        }

        //Delete associated products from the purchase_products table (Deleted first to avoid foreign key error constraints)
        await connection.execute(
          "DELETE FROM purchase_products WHERE purchase_id = ?",
          [id],
        );

        //Delete the record from the purchasesinfo table
        await connection.execute("DELETE FROM purchasesinfo WHERE id = ?", [id]);

        return {
          status: 200,
          message: "Purchase request has been deleted successfully",
        };
      });

      return Response.json({ message: result.message }, { status: result.status });
    } catch (error) {
      console.error("API Deletion Error:", error);
      return Response.json(
        { message: "Error Deleting the Purchase Request" },
        { status: 500 },
      );
    }
  },
  { roles: ["staff"] },
);
