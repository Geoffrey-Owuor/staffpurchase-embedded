import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

export const PUT = requireAuth(
  async (_req, { params }) => {
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
          `SELECT request_closure FROM purchasesinfo WHERE id = ? FOR UPDATE`,
          [id],
        );

        if (checkPurchase.length === 0) {
          return {
            status: 404,
            message: "Purchase request not found or has been deleted",
          };
        }

        const isClosed = checkPurchase[0].request_closure === "closed";

        if (isClosed) {
          return { status: 403, message: "Purchase request is already closed" };
        }

        //Update the request closure to closed
        await connection.execute(
          `UPDATE purchasesinfo SET request_closure = 'closed' WHERE id = ?`,
          [id],
        );

        return {
          status: 200,
          message: "Purchase request has been closed successfully",
        };
      });

      return Response.json({ message: result.message }, { status: result.status });
    } catch (error) {
      console.error("Error closing purchase request:", error);
      return Response.json(
        { message: "Error closing purchase request" },
        { status: 500 },
      );
    }
  },
  { roles: ["cc", "bi"] },
);
