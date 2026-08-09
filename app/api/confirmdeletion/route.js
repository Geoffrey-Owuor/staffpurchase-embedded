import pool from "@/lib/db";
import { verifyPassword } from "@/app/lib/auth";
import { requireAuth } from "@/lib/apiAuth";

export const POST = requireAuth(async (request, { user }) => {
  const { password } = await request.json();

  try {
    const [result] = await pool.execute(
      `SELECT password from users WHERE email = ? LIMIT 1`,
      [user.email],
    );

    // Check if a user was found
    if (result.length === 0) {
      // User not found is generally treated as an invalid credential error
      return Response.json({ valid: false }, { status: 401 });
    }

    const userPassword = result[0].password;

    const isValid = await verifyPassword(password, userPassword);

    return Response.json({ valid: isValid }, { status: 200 });
  } catch (error) {
    console.error("Error verifying your password", error);
    return Response.json({ valid: false }, { status: 500 });
  }
});
