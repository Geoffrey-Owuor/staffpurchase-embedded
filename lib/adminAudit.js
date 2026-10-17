// Records one admin action in admin_audit_log
// (db/migrations/2026-10-17_admin_audit_log.sql). Always call it with the
// same connection/transaction as the change it describes, so the change and
// its audit row commit or roll back together.
// `before`/`after` are plain objects - never include passwords or tokens.
export async function writeAdminAudit(
  connection,
  { admin, action, targetType, targetId, targetLabel, reason, before, after },
) {
  await connection.execute(
    `INSERT INTO admin_audit_log
       (admin_id, admin_name, admin_email, action, target_type, target_id, target_label, reason, before_data, after_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      admin.id,
      admin.name ?? null,
      admin.email,
      action,
      targetType,
      String(targetId),
      targetLabel ?? null,
      reason || null,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
    ],
  );
}
