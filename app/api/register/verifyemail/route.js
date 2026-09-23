// app/api/register/verifyemail/route.js - Email Submission
import pool from "@/lib/db";
import { sendVerificationEmail } from "@/lib/verificationEmail";
import { parseEmail, INVALID_EMAIL_MESSAGE } from "@/lib/emailValidation";
import { emailDomainAcceptsMail } from "@/lib/emailDomainCheck";
import crypto from "crypto";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { requireAuth } from "@/lib/apiAuth";

// Shared by POST (registration) and PUT (change email): validates the address,
// stores a fresh code and emails it. Returns {email} on success, or
// {status, message} when the request should be rejected.
async function issueVerificationCode(conn, rawEmail) {
  const email = parseEmail(rawEmail);
  if (!email) return { status: 400, message: INVALID_EMAIL_MESSAGE };

  // Check if email already registered
  const [existingUsers] = await conn.execute(
    "SELECT id FROM users WHERE email = ?",
    [email],
  );

  if (existingUsers.length > 0) {
    return {
      status: 409,
      message: "We couldn't verify your email. Try another email or sign in.",
    };
  }

  // Catch typo'd domains (e.g. "gmial.con") before we try to email them
  if (!(await emailDomainAcceptsMail(email))) {
    return {
      status: 400,
      message:
        "This email domain can't receive mail. Please check the address for typos.",
    };
  }

  // Generate 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();

  // Store or update verification code
  await conn.execute(
    `INSERT INTO verification_codes (email, code, expires_at) 
     VALUES (?, ?, NOW() + INTERVAL 5 MINUTE) 
     ON DUPLICATE KEY UPDATE code = ?, expires_at = NOW() + INTERVAL 5 MINUTE, verified = 0`,
    [email, code, code],
  );

  // Send verification email - if Graph rejects the address, don't leave a
  // code behind or tell the user one was sent
  try {
    await sendVerificationEmail(email, code);
  } catch (error) {
    console.error(`Verification email to ${email} failed:`, error.message);
    await conn.execute(
      "DELETE FROM verification_codes WHERE email = ? AND verified = 0",
      [email],
    );
    return {
      status: 502,
      message:
        "We couldn't send a code to this email address. Please check it and try again.",
    };
  }

  return { email };
}

export async function POST(request) {
  let conn;
  try {
    const { email: rawEmail } = await request.json();

    conn = await pool.getConnection();

    const result = await issueVerificationCode(conn, rawEmail);
    if (result.status) {
      return Response.json(
        { success: false, message: result.message },
        { status: result.status },
      );
    }

    //Sign the JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ email: result.email })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("5m")
      .sign(secret);

    //Stote in a HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("verify_email", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/register",
      maxAge: 300, // 5 Minutes
    });

    return Response.json(
      {
        success: true,
        message: "Verification code has been sent to your email",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return Response.json(
      { success: false, message: "Failed to send verification code" },
      { status: 500 },
    );
  } finally {
    if (conn) conn.release();
  }
}

// Change email (Settings) - only for logged-in users
export const PUT = requireAuth(async (request) => {
  let conn;

  try {
    const { email: rawEmail } = await request.json();

    conn = await pool.getConnection();

    const result = await issueVerificationCode(conn, rawEmail);
    if (result.status) {
      return Response.json(
        { message: result.message },
        { status: result.status },
      );
    }

    return Response.json(
      { message: "Verification code has been sent to your email" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return Response.json(
      { message: "Failed to send verification code" },
      { status: 500 },
    );
  } finally {
    if (conn) conn.release();
  }
});
