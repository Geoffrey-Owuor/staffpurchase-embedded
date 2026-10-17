// Labels and option lists shared by the admin API routes and pages (no
// server-only imports, so client components can use them too).
import { VALID_ROLES } from "@/utils/routes";

export const ROLE_LABELS = {
  staff: "Staff",
  payroll: "Payroll",
  hr: "HR",
  cc: "Credit Control",
  bi: "Billing & Invoicing",
  admin: "Admin",
};

export const ROLE_OPTIONS = VALID_ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role] ?? role,
}));

// Account status as the admin pages show it. "locked" is the failed-login
// lockout (password_attempts >= MAX_LOGIN_ATTEMPTS), "deactivated" is
// is_active = 0 - see lib/loginPolicy.js.
export const USER_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "locked", label: "Locked" },
  { value: "deactivated", label: "Deactivated" },
];

// Every action admin_audit_log can hold, with the label the audit page shows.
export const ADMIN_AUDIT_ACTIONS = {
  "user.update_profile": "Profile edited",
  "user.change_role": "Role changed",
  "user.deactivate": "Account deactivated",
  "user.reactivate": "Account reactivated",
  "user.unlock": "Account unlocked",
  "user.send_reset": "Reset link sent",
  "purchase.edit": "Request edited",
  "purchase.delete": "Request deleted",
};

export const ADMIN_AUDIT_ACTION_OPTIONS = Object.entries(
  ADMIN_AUDIT_ACTIONS,
).map(([value, label]) => ({ value, label }));

export const ADMIN_AUDIT_TARGET_OPTIONS = [
  { value: "user", label: "Users" },
  { value: "purchase", label: "Purchase requests" },
];

// Free-text limits the admin user routes enforce (and the forms mirror).
export const REASON_MAX_LENGTH = 500;
export const PROFILE_FIELD_MAX_LENGTH = 255;
