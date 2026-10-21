// app/api/register/completeregistration/route.js - Complete Registration
import { hashPassword, createSession } from "@/app/lib/auth";
import pool from "@/lib/db";
import { parseEmail, INVALID_EMAIL_MESSAGE } from "@/lib/emailValidation";
import {
  clearVerifyEmailCookie,
  getVerifyEmailCookie,
} from "@/lib/verifyEmailCookie";
import { CachedDepartments } from "@/utils/Cache/CachedConditions";
import {
  DUPLICATE_PAYROLL_MESSAGE,
  payrollNoTaken,
  resolveRegistrationStaff,
} from "@/lib/registrationStaff";

// Every new account starts as staff; admins assign other roles from the
// Users page (there used to be a hardcoded email -> role map here).
const NEW_USER_ROLE = "staff";

export async function POST(request) {
  let conn;
  try {
    const {
      email: rawEmail,
      password,
      payrollNo: typedPayrollNo,
      department: chosenDepartment,
    } = await request.json();
    const email = parseEmail(rawEmail);

    if (!email) {
      return Response.json(
        { success: false, message: INVALID_EMAIL_MESSAGE },
        { status: 400 },
      );
    }

    // Only the browser that asked for the code may finish (lib/verifyEmailCookie.js)
    if ((await getVerifyEmailCookie()) !== email) {
      return Response.json(
        { success: false, message: "Code expired, please register again" },
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

    // Name and payroll number come from the staff record, never the client
    // (lib/registrationStaff.js); a company email's owner only types the
    // payroll number to find it
    const resolved = await resolveRegistrationStaff(conn, email, typedPayrollNo);
    if (resolved.status) {
      return Response.json(
        { success: false, message: resolved.message },
        { status: resolved.status },
      );
    }
    const { name, staffNumber: payrollNo } = resolved.staff;

    // The record's department when it matches an active one of ours,
    // otherwise one of the active departments offered on the form
    // (departments table, managed on the admin Reference Data page)
    let department = resolved.staff.department;
    if (!department) {
      const departments = await CachedDepartments();
      const isOfferedDepartment = departments.some(
        (d) => d.is_active && d.name === chosenDepartment,
      );
      if (!isOfferedDepartment) {
        return Response.json(
          { success: false, message: "Choose a department from the list" },
          { status: 400 },
        );
      }
      department = chosenDepartment;
    }

    // --- START TRANSACTION: Ensure atomicity for DB writes ---
    await conn.beginTransaction();

    // One account per payroll number - checked again under a lock, in case
    // another registration for it finished since the check above
    if (await payrollNoTaken(conn, payrollNo, { lock: true })) {
      await conn.rollback();
      return Response.json(
        { success: false, message: DUPLICATE_PAYROLL_MESSAGE },
        { status: 409 },
      );
    }

    const role = NEW_USER_ROLE;
    const hashedPassword = await hashPassword(password);

    // Create user - verified against the staff directory just now
    const [userResult] = await conn.execute(
      `INSERT INTO users (name, email, password, payrollNo, department, role, staff_verified_at)
       VALUES(?,?,?,?,?,?,NOW())`,
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
    await clearVerifyEmailCookie();

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
