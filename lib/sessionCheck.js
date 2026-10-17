import pool from "@/lib/db";

// The session JWT can't know about anything that happened after it was
// issued, so every server-side gate (requireAuth, the dashboard layout,
// check-session, SSO session reuse) also checks the account here: it must
// still exist, be active, and carry the same session_version the JWT was
// issued with. Bumping users.session_version (deactivation, role change,
// password reset) therefore ends every existing session for that user.
// Not "use server" on purpose - it must not become a callable action.
export async function isSessionCurrent(user) {
  if (!user?.valid || !user.id) return false;

  const [rows] = await pool.execute(
    "SELECT is_active, session_version FROM users WHERE id = ? LIMIT 1",
    [user.id],
  );

  return (
    rows.length > 0 &&
    Boolean(rows[0].is_active) &&
    rows[0].session_version === user.sessionVersion
  );
}
