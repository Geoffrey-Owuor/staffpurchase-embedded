import pool from "@/lib/db";
import { hashPassword, verifyPassword } from "@/app/lib/auth";
import { requireAuth } from "@/lib/apiAuth";

export async function POST(request) {
  const { token, newPassword } = await request.json();
  let conn;

  try {
    conn = await pool.getConnection();
    //Verify token
    const [users] = await conn.execute(
      "SELECT id, password from users WHERE reset_token = ? AND reset_token_expiry > NOW()",
      [token],
    );

    if (users.length === 0) {
      return Response.json(
        { message: " Invalid or expired token" },
        { status: 400 },
      );
    }

    const userId = users[0].id;
    const currentHashedPassword = users[0].password;

    // Optional Security Check: Prevent reuse of the *current* password
    const isSameAsCurrent = await verifyPassword(
      newPassword,
      currentHashedPassword,
    );
    if (isSameAsCurrent) {
      return Response.json(
        {
          message: "New password cannot be the same as your current password.",
        },
        { status: 400 },
      );
    }

    //Hash New Password
    const hashedPassword = await hashPassword(newPassword);

    //Update password and clear the token. Proving ownership of the mailbox
    //also lifts a failed-attempts lockout (not an admin deactivation), and
    //ends every existing session (lib/sessionCheck.js).
    await conn.execute(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL, password_attempts = 0, session_version = session_version + 1 WHERE id = ?",
      [hashedPassword, userId],
    );

    return Response.json({
      message: "Your password has been updated successfully",
    });
  } catch (error) {
    console.error("Password Reset Error:", error);
    return Response.json(
      { message: "Failed to reset password" },
      { status: 500 },
    );
  } finally {
    if (conn) conn.release();
  }
}

// Change password from Settings. The account is always the signed-in one -
// never an email from the request body, which let anyone guess passwords
// here without tripping the login lockout.
export const PUT = requireAuth(async (request, { user }) => {
  const { currentPassword, newPassword } = await request.json();
  let conn;

  try {
    conn = await pool.getConnection();
    //verify user
    const [verifyUser] = await conn.execute(
      "SELECT id, password from users WHERE id = ?",
      [user.id],
    );

    if (verifyUser.length === 0) {
      return Response.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const userId = verifyUser[0].id;
    const currentHashedPassword = verifyUser[0].password;

    //verify password
    const isValid = await verifyPassword(
      currentPassword,
      currentHashedPassword,
    );
    if (!isValid) {
      return Response.json(
        { message: "You current password is incorrect" },
        { status: 401 },
      );
    }

    // 3. Prevent reuse of the current password (Security Enhancement)
    const isSameAsCurrent = await verifyPassword(
      newPassword,
      currentHashedPassword,
    );
    if (isSameAsCurrent) {
      return Response.json(
        {
          message:
            "The new password cannot be the same as your current password.",
        },
        { status: 400 },
      );
    }

    //Hashing new password
    const hashedNewPassword = await hashPassword(newPassword);

    //Update the previous password
    await conn.execute("UPDATE users SET password = ? WHERE id = ?", [
      hashedNewPassword,
      userId,
    ]);

    return Response.json(
      { message: "Your password has been updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return Response.json(
      { message: "Failed to reset password" },
      { status: 500 },
    );
  } finally {
    if (conn) conn.release();
  }
});
