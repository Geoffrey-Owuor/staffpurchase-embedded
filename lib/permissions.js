// Server-side permission checks (user_permissions table - see
// utils/permissions.js for the registry). Read from the DB on every check,
// never from the JWT, so a grant or revoke applies on the user's next request
// without ending their session.
// Not "use server" on purpose - it must not become a callable action.
import pool from "@/lib/db";
import { PERMISSION_KEYS, isValidPermission } from "@/utils/permissions";

// The user's effective permissions: every key for an admin, else their
// registered grants (unknown/retired keys are dropped).
export async function getUserPermissions(user) {
  if (!user?.id) return [];
  if (user.role === "admin") return [...PERMISSION_KEYS];

  try {
    const [rows] = await pool.execute(
      "SELECT permission FROM user_permissions WHERE user_id = ?",
      [user.id],
    );
    return rows
      .map((row) => row.permission)
      .filter(isValidPermission)
      .sort();
  } catch (error) {
    // Deployed before the migration ran: nobody but admins has access yet,
    // rather than every dashboard page failing.
    if (error.code === "ER_NO_SUCH_TABLE") return [];
    throw error;
  }
}

export async function userHasPermission(user, key) {
  if (!isValidPermission(key)) return false;
  if (user?.role === "admin") return true;
  return (await getUserPermissions(user)).includes(key);
}
