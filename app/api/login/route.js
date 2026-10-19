import { verifyPassword, createSession } from "@/app/lib/auth";
import pool from "@/lib/db";
import {
  MAX_LOGIN_ATTEMPTS,
  LOCKED_OUT_MESSAGE,
  isLockedOut,
} from "@/lib/loginPolicy";
import { parseEmail } from "@/lib/emailValidation";

export async function POST(request) {
  try {
    const { email: rawEmail, password } = await request.json();
    const email = parseEmail(rawEmail);

    // A malformed email can't belong to an account - answer exactly like an
    // unknown user so this doesn't reveal anything extra
    if (!email) {
      return Response.json(
        { success: false, message: "Wrong email or password" },
        { status: 401 },
      );
    }

    // 1. Find user by email (added is_active and password_attempts to SELECT)
    const [users] = await pool.execute(
      "SELECT id, password, name, payrollNo, department, role, is_active, password_attempts, session_version FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (!users.length) {
      return Response.json(
        { success: false, message: "Wrong email or password" },
        { status: 401 },
      );
    }
    const user = users[0];

    // 2. Check if an admin has deactivated the account
    if (!user.is_active) {
      return Response.json(
        {
          success: false,
          message: "Account is disabled, contact the administrator",
        },
        { status: 403 }, // 403 Forbidden is ideal for locked accounts
      );
    }

    // A lockout is just the attempt counter (is_active is admin-only). A
    // password reset or an admin unlock clears it.
    if (isLockedOut(user.password_attempts)) {
      return Response.json(
        { success: false, message: LOCKED_OUT_MESSAGE },
        { status: 403 },
      );
    }

    // 3. Verify Password
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      const newAttempts = user.password_attempts + 1;
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - newAttempts;

      if (remainingAttempts <= 0) {
        // Lock the account by recording the final failed attempt
        await pool.execute(
          "UPDATE users SET password_attempts = ? WHERE id = ?",
          [newAttempts, user.id],
        );
        return Response.json(
          { success: false, message: LOCKED_OUT_MESSAGE },
          { status: 403 },
        );
      } else {
        // Just increment the counter
        await pool.execute(
          "UPDATE users SET password_attempts = ? WHERE id = ?",
          [newAttempts, user.id],
        );
        return Response.json(
          {
            success: false,
            message: `Wrong email or password. ${remainingAttempts} attempt${
              remainingAttempts === 1 ? "" : "s"
            } remaining before your account is locked.`,
          },
          { status: 401 },
        );
      }
    }

    // 4. SUCCESS: Reset attempts back to 0 if they previously had failed attempts
    if (user.password_attempts > 0) {
      await pool.execute(
        "UPDATE users SET password_attempts = 0 WHERE id = ?",
        [user.id],
      );
    }

    // 5. Create Session
    await createSession(
      user.id,
      user.role,
      user.name,
      email,
      user.payrollNo,
      user.department,
      user.session_version,
    );

    return Response.json({ success: true, role: user.role, id: user.id });
  } catch (error) {
    console.error("Login Error:", error);
    return Response.json(
      { success: false, message: "Server error. Please try again" },
      { status: 500 },
    );
  }
}
