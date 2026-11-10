import { withConnection } from "@/lib/db";

/**
 * Where workflow notifications about a request go: the requester's current,
 * verified account email. purchasesinfo.user_email is the contact address the
 * requester typed for insurance information, so it's only used if the account
 * can't be found (very old requests).
 */
export async function getRequesterEmail(purchase) {
  const rows = await withConnection(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT email FROM users WHERE id = ?`,
      [purchase.user_id],
    );
    return rows;
  });

  return rows[0]?.email || purchase.user_email;
}
