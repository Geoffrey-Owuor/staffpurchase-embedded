// app/api/admin/users/[id]/route.js - one admin action on one user account.
// Body: { action, reason?, ...action fields }. Every action runs in one
// transaction with its admin_audit_log row (lib/adminAudit.js).
import { withConnection, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import { isLockedOut } from "@/lib/loginPolicy";
import { createPasswordResetLink } from "@/lib/passwordReset";
import { sendResetEmail } from "@/lib/nodemailer";
import { isValidRole } from "@/utils/routes";
import {
  ROLE_LABELS,
  REASON_MAX_LENGTH,
  PROFILE_FIELD_MAX_LENGTH,
} from "@/utils/Admin/adminConstants";

class RouteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const USER_COLUMNS = `id, name, email, role, payrollNo, department, is_active, password_attempts, created_at`;

const APPROVER_ROLES = ["payroll", "hr", "cc", "bi"];

// What the audit log records about an account - never password/token columns.
const snapshot = (user) => ({
  name: user.name,
  role: user.role,
  payrollNo: user.payrollNo,
  department: user.department,
  is_active: Boolean(user.is_active),
  password_attempts: user.password_attempts,
});

// Actions that cut the user off: these require a reason, can't target the
// acting admin (so an admin can never lock themselves out or demote the last
// admin - the actor always remains an active admin), and end the user's
// sessions.
const REASON_REQUIRED = ["change_role", "deactivate", "reactivate"];
const NOT_ON_SELF = ["change_role", "deactivate"];

const AUDIT_ACTION = {
  update_profile: "user.update_profile",
  change_role: "user.change_role",
  deactivate: "user.deactivate",
  reactivate: "user.reactivate",
  unlock: "user.unlock",
  send_reset: "user.send_reset",
};

function readProfileField(body, key, label) {
  const value = typeof body[key] === "string" ? body[key].trim() : "";
  if (!value) throw new RouteError(400, `${label} is required`);
  if (value.length > PROFILE_FIELD_MAX_LENGTH) {
    throw new RouteError(400, `${label} is too long`);
  }
  return value;
}

async function fetchUser(connection, id, { lock = false } = {}) {
  const [rows] = await connection.execute(
    `SELECT ${USER_COLUMNS},
            (SELECT COUNT(*) FROM purchasesinfo p WHERE p.user_id = users.id) AS requestCount
     FROM users WHERE id = ?${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  return rows[0] ?? null;
}

// Removing someone from an approval role (role change or deactivation) can
// leave that stage with nobody to approve it - allowed, but say so.
async function lastApproverWarning(connection, target) {
  if (!APPROVER_ROLES.includes(target.role)) return null;
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count FROM users WHERE role = ? AND is_active = 1 AND id <> ?`,
    [target.role, target.id],
  );
  if (rows[0].count > 0) return null;
  const label = ROLE_LABELS[target.role];
  return `No other active ${label} user remains - ${label} approvals will wait until one is assigned.`;
}

export const GET = requireAuth(
  async (_request, { params }) => {
    const { id } = await params;
    const user = await withConnection((connection) =>
      fetchUser(connection, id),
    );
    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }
    return Response.json({ user });
  },
  { roles: ["admin"] },
);

export const PATCH = requireAuth(
  async (request, { params, user: admin }) => {
    const { id } = await params;
    const targetId = Number(id);
    if (!Number.isInteger(targetId)) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    try {
      const body = await request.json();
      const { action } = body;
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";

      if (!AUDIT_ACTION[action]) {
        throw new RouteError(400, "Unknown action");
      }
      if (REASON_REQUIRED.includes(action) && !reason) {
        throw new RouteError(400, "A reason is required for this action");
      }
      if (reason.length > REASON_MAX_LENGTH) {
        throw new RouteError(400, "Reason is too long");
      }
      if (NOT_ON_SELF.includes(action) && targetId === admin.id) {
        throw new RouteError(403, "You can't do this to your own account");
      }

      const { message, warning, resetLink, email } = await withTransaction(
        async (connection) => {
          const target = await fetchUser(connection, targetId, { lock: true });
          if (!target) throw new RouteError(404, "User not found");

          const before = snapshot(target);
          let after = before;
          let message;
          let warning = null;
          let resetLink = null;

          switch (action) {
            case "update_profile": {
              const name = readProfileField(body, "name", "Name");
              const payrollNo = readProfileField(
                body,
                "payrollNo",
                "Payroll No",
              );
              const department = readProfileField(
                body,
                "department",
                "Department",
              );
              if (
                name === target.name &&
                payrollNo === target.payrollNo &&
                department === target.department
              ) {
                throw new RouteError(400, "No changes to save");
              }
              // These are copied into the session JWT, so end the user's
              // sessions to pick the new values up. Existing purchase
              // requests keep the snapshot they were submitted with.
              await connection.execute(
                `UPDATE users SET name = ?, payrollNo = ?, department = ?,
                   session_version = session_version + 1 WHERE id = ?`,
                [name, payrollNo, department, target.id],
              );
              after = { ...before, name, payrollNo, department };
              message = "Profile updated. The user will need to sign in again.";
              break;
            }

            case "change_role": {
              const role = body.role;
              if (!isValidRole(role)) throw new RouteError(400, "Invalid role");
              if (role === target.role) {
                throw new RouteError(400, "The user already has this role");
              }
              warning = await lastApproverWarning(connection, target);
              await connection.execute(
                `UPDATE users SET role = ?, session_version = session_version + 1 WHERE id = ?`,
                [role, target.id],
              );
              after = { ...before, role };
              message = `Role changed to ${ROLE_LABELS[role]}. The user has been signed out.`;
              break;
            }

            case "deactivate": {
              if (!target.is_active) {
                throw new RouteError(
                  409,
                  "This account is already deactivated",
                );
              }
              warning = await lastApproverWarning(connection, target);
              await connection.execute(
                `UPDATE users SET is_active = 0, session_version = session_version + 1 WHERE id = ?`,
                [target.id],
              );
              after = { ...before, is_active: false };
              message = "Account deactivated. The user has been signed out.";
              break;
            }

            case "reactivate": {
              if (target.is_active) {
                throw new RouteError(409, "This account is already active");
              }
              await connection.execute(
                `UPDATE users SET is_active = 1 WHERE id = ?`,
                [target.id],
              );
              after = { ...before, is_active: true };
              message = isLockedOut(target.password_attempts)
                ? "Account reactivated. It is still locked - unlock it or send a reset link."
                : "Account reactivated.";
              break;
            }

            case "unlock": {
              if (!isLockedOut(target.password_attempts)) {
                throw new RouteError(409, "This account isn't locked");
              }
              await connection.execute(
                `UPDATE users SET password_attempts = 0 WHERE id = ?`,
                [target.id],
              );
              after = { ...before, password_attempts: 0 };
              message = "Account unlocked.";
              break;
            }

            case "send_reset": {
              // Unlock + reset link: the admin never sees or sets a password.
              resetLink = await createPasswordResetLink(connection, target.id);
              await connection.execute(
                `UPDATE users SET password_attempts = 0 WHERE id = ?`,
                [target.id],
              );
              after = { ...before, password_attempts: 0 };
              message = `Reset link sent to ${target.email} (valid for 1 hour).`;
              if (!target.is_active) {
                warning =
                  "The account is deactivated - reactivate it before the user can sign in.";
              }
              break;
            }
          }

          await writeAdminAudit(connection, {
            admin,
            action: AUDIT_ACTION[action],
            targetType: "user",
            targetId: target.id,
            targetLabel: target.email,
            reason,
            before,
            after,
          });

          return { message, warning, resetLink, email: target.email };
        },
      );

      // Auth email - sent directly (never skipped by NOTIFICATION_EMAILS_ENABLED).
      // Unlike the public forgot-password route, the admin is told if it fails.
      if (resetLink) {
        try {
          await sendResetEmail(email, resetLink);
        } catch (error) {
          console.error(`Admin reset email to ${email} failed:`, error.message);
          return Response.json(
            {
              message:
                "The account was unlocked and a reset link created, but the email failed to send. Try again.",
              user: await withConnection((c) => fetchUser(c, targetId)),
            },
            { status: 502 },
          );
        }
      }

      const updated = await withConnection((c) => fetchUser(c, targetId));
      return Response.json({ message, warning, user: updated });
    } catch (error) {
      if (error instanceof RouteError) {
        return Response.json(
          { message: error.message },
          { status: error.status },
        );
      }
      console.error("Admin user action error:", error);
      return Response.json(
        { message: "Error updating the user" },
        { status: 500 },
      );
    }
  },
  { roles: ["admin"] },
);
