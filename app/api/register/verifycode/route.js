// app/api/register/verifycode/route.js - Code Verification
import pool from "@/lib/db";
import { parseEmail, INVALID_EMAIL_MESSAGE } from "@/lib/emailValidation";
import { requireAuth } from "@/lib/apiAuth";

export async function POST(request) {
  let conn;
  try {
    const { email: rawEmail, code } = await request.json();
    const email = parseEmail(rawEmail);

    if (!email) {
      return Response.json(
        { success: false, message: INVALID_EMAIL_MESSAGE },
        { status: 400 },
      );
    }

    conn = await pool.getConnection();

    // Verify the code
    const [results] = await conn.execute(
      `SELECT * FROM verification_codes 
       WHERE email = ? AND code = ? AND expires_at > NOW() AND verified = 0`,
      [email, code],
    );

    if (results.length === 0) {
      return Response.json(
        { success: false, message: "Invalid or expired verification code" },
        { status: 400 },
      );
    }

    // ✅ Mark as verified
    await conn.execute(
      `UPDATE verification_codes 
       SET verified = 1 
       WHERE email = ?`,
      [email],
    );

    return Response.json(
      { success: true, message: "Your code has been verified successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Code verification error:", error);
    return Response.json(
      { success: false, message: "Verification failed" },
      { status: 500 },
    );
  } finally {
    if (conn) conn.release();
  }
}

// Change email for the logged-in user. The account being changed always comes
// from the session - never from the request body - otherwise anyone who can
// verify an address they own could move another user's account onto it.
export const PUT = requireAuth(async (request, { user }) => {
  let conn;

  try {
    const { code, newemail: rawNewEmail } = await request.json();
    const newemail = parseEmail(rawNewEmail);

    if (!newemail) {
      return Response.json({ message: INVALID_EMAIL_MESSAGE }, { status: 400 });
    }

    conn = await pool.getConnection();

    //Verify the code
    const [result] = await conn.execute(
      `SELECT id FROM verification_codes
       WHERE code = ? AND email = ? AND expires_at > NOW() AND verified = 0`,
      [code, newemail],
    );

    if (!result.length) {
      return Response.json(
        { message: "Invalid or expired verification code" },
        { status: 400 },
      );
    }

    // --- Start Transaction for Modification Steps ---
    await conn.beginTransaction();

    // The address may have been registered since the code was issued
    const [taken] = await conn.execute(
      `SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1 FOR UPDATE`,
      [newemail, user.id],
    );

    if (taken.length > 0) {
      await conn.rollback();
      return Response.json(
        { message: "We couldn't update your email. Try another email." },
        { status: 409 },
      );
    }

    const [emailUpdate] = await conn.execute(
      `UPDATE users SET email = ? WHERE id = ?`,
      [newemail, user.id],
    );

    if (emailUpdate.affectedRows === 0) {
      await conn.rollback();
      return Response.json(
        { message: "Email not updated or account not found" },
        { status: 400 },
      );
    }

    // Clean up verification code
    await conn.execute(`DELETE FROM verification_codes WHERE email = ?`, [
      newemail,
    ]);

    // 4. Commit all changes
    await conn.commit();

    return Response.json(
      { message: "Email updated successfully, you'll be logged out shortly" },
      { status: 200 },
    );
  } catch (error) {
    if (conn) await conn.rollback(); // Rollback in case of failure during transaction
    console.error("Code verification error:", error);
    return Response.json({ message: "Verification failed" }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
});
