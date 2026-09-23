// app/api/forgot-password/route.js
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { sendResetEmail } from "@/lib/nodemailer";
import { parseEmail, INVALID_EMAIL_MESSAGE } from "@/lib/emailValidation";

export async function POST(request) {
  const { email: rawEmail } = await request.json();
  const email = parseEmail(rawEmail);
  let conn;

  if (!email) {
    return Response.json({ message: INVALID_EMAIL_MESSAGE }, { status: 400 });
  }

  try {
    conn = await pool.getConnection();

    // --- Start Transaction ---
    await conn.beginTransaction();

    const [users] = await conn.execute("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    // Always return the same message to prevent email enumeration
    if (users.length === 0) {
      await conn.rollback();
      return Response.json(
        { message: "If an account exists, a reset link has been sent" },
        { status: 200 },
      );
    }

    const userId = users[0].id;
    const token = uuidv4();

    await conn.execute(
      "UPDATE users SET reset_token = ?, reset_token_expiry = NOW() + INTERVAL 1 HOUR WHERE id = ?",
      [token, userId],
    );

    //Commit transaction
    await conn.commit();

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;
    try {
      await sendResetEmail(email, resetLink);
    } catch (error) {
      // Log, but keep the generic response below - surfacing a send failure
      // here would reveal that the account exists
      console.error(`Password reset email to ${email} failed:`, error.message);
    }

    return Response.json({
      message: "If an account exists, a reset link has been sent",
    });
  } catch (error) {
    // --- Rollback on Error ---
    if (conn) await conn.rollback();
    console.error("Password reset error:", error);
    return Response.json(
      { message: "Failed to process request" },
      { status: 500 },
    );
  } finally {
    if (conn) conn.release();
  }
}
