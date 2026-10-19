import { v4 as uuidv4 } from "uuid";

// Issues a fresh one-hour reset token for a user and returns the link to
// email. Shared by the public forgot-password flow and the admin
// "Send reset link" action; the caller sends the email (sendResetEmail in
// lib/nodemailer.js) after its transaction commits.
export async function createPasswordResetLink(connection, userId) {
  const token = uuidv4();

  await connection.execute(
    "UPDATE users SET reset_token = ?, reset_token_expiry = NOW() + INTERVAL 1 HOUR WHERE id = ?",
    [token, userId],
  );

  return `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;
}
