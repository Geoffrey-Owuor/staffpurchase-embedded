// app/api/register/completeregistration/route.js - Complete Registration
import { hashPassword, createSession } from "@/app/lib/auth";
import pool from "@/lib/db";
import { parseEmail, INVALID_EMAIL_MESSAGE } from "@/lib/emailValidation";
import { cookies } from "next/headers";
import { CachedDepartments } from "@/utils/Cache/CachedConditions";

// Every new account starts as staff; admins assign other roles from the
// Users page (there used to be a hardcoded email -> role map here).
const NEW_USER_ROLE = "staff";

export async function POST(request) {
  let conn;
  try {
    const {
      name,
      email: rawEmail,
      password,
      payrollNo,
      department,
    } = await request.json();
    const email = parseEmail(rawEmail);

    if (!email) {
      return Response.json(
        { success: false, message: INVALID_EMAIL_MESSAGE },
        { status: 400 },
      );
    }

    // Must be one of the active departments offered on the form
    // (departments table, managed on the admin Reference Data page)
    const departments = await CachedDepartments();
    const isOfferedDepartment = departments.some(
      (d) => d.is_active && d.name === department,
    );
    if (!isOfferedDepartment) {
      return Response.json(
        { success: false, message: "Choose a department from the list" },
        { status: 400 },
      );
    }

    conn = await pool.getConnection();

    // Verify email was previously verified
    const [verified] = await conn.execute(
      `SELECT * FROM verification_codes WHERE email = ? AND verified = 1 AND expires_at > NOW()`,
      [email],
    );

    if (verified.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Code expired, please register again",
        },
        { status: 400 },
      );
    }

    // --- START TRANSACTION: Ensure atomicity for DB writes ---
    await conn.beginTransaction();

    const role = NEW_USER_ROLE;
    const hashedPassword = await hashPassword(password);

    // Create user
    const [userResult] = await conn.execute(
      `INSERT INTO users (name, email, password, payrollNo, department, role) VALUES(?,?,?,?,?,?)`,
      [name, email, hashedPassword, payrollNo, department, role],
    );

    const userId = userResult.insertId;

    // Clean up verification code
    await conn.execute(`DELETE FROM verification_codes WHERE email = ?`, [
      email,
    ]);

    // --- COMMIT: Save all changes permanently to the DB ---
    await conn.commit();

    // A new account starts at session_version 0 (the column default)
    await createSession(userId, role, name, email, payrollNo, department, 0);

    // Delete the verify_email cookie now that it's no longer needed
    const cookieStore = await cookies();
    cookieStore.set({
      name: "verify_email",
      value: "",
      path: "/",
      maxAge: 0, // Immediately expires
    });

    return Response.json(
      {
        success: true,
        userId,
        role,
      },
      { status: 201 },
    );
  } catch (error) {
    // Attempt rollback if error occurred during transaction phase
    if (conn) await conn.rollback();
    console.error("Complete registration error:", error);

    return Response.json(
      {
        success: false,
        message: "Registration failed. This may be due to an existing account.",
      },
      { status: 500 },
    );
  } finally {
    if (conn) conn.release();
  }
}
