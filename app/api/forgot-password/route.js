// app/api/forgot-password/route.js
import pool from "@/lib/db";
import { sendResetEmail } from "@/lib/nodemailer";
import { createPasswordResetLink } from "@/lib/passwordReset";
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

    const resetLink = await createPasswordResetLink(conn, users[0].id);

    //Commit transaction
    await conn.commit();

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
