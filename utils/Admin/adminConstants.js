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

// Staff directory checks on the Users page (api/admin/users STAFF_CHECK_CLAUSES)
export const STAFF_CHECK_OPTIONS = [
  { value: "unverified", label: "Unverified staff record" },
  { value: "duplicate", label: "Duplicate payroll no" },
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
  "reference.create": "Reference data added",
  "reference.update": "Reference data changed",
  "setting.update": "Setting changed",
  "banner.create": "Banner created",
  "banner.update": "Banner changed",
  "banner.delete": "Banner deleted",
};

export const ADMIN_AUDIT_ACTION_OPTIONS = Object.entries(
  ADMIN_AUDIT_ACTIONS,
).map(([value, label]) => ({ value, label }));

export const ADMIN_AUDIT_TARGET_OPTIONS = [
  { value: "user", label: "Users" },
  { value: "purchase", label: "Purchase requests" },
  { value: "reference", label: "Reference data & settings" },
  { value: "banner", label: "Banners" },
];

// Single-value settings (app_settings table) the app reads and the admin
// Reference Data page edits. Only these keys are ever read or written.
export const APP_SETTINGS = {
  mpesa_till_number: {
    label: "M-Pesa till number",
    description: "Shown on the New Purchase form for cash payments",
    pattern: /^\d{4,10}$/,
    patternMessage: "Enter 4-10 digits",
  },
};

export const LOCATION_CODE_PATTERN = /^[A-Z0-9_]{2,32}$/;
export const LOCATION_LABEL_MAX_LENGTH = 100;
export const DEPARTMENT_NAME_MAX_LENGTH = 55;

// Free-text limits the admin user routes enforce (and the forms mirror).
export const REASON_MAX_LENGTH = 500;
export const PROFILE_FIELD_MAX_LENGTH = 255;

// Dashboard banners (system_banners, managed at /dashboard/admin/banners).
// Status is derived from is_active + the start/end window against the DB's
// NOW() - see BANNER_STATUS_SQL in app/api/admin/banners/route.js.
export const BANNER_MESSAGE_MAX_LENGTH = 500;
export const BANNER_PRIORITY_RANGE = { min: -100, max: 100 };

export const BANNER_SEVERITY_OPTIONS = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical (can't be dismissed)" },
];

export const BANNER_STATUS_OPTIONS = [
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Inactive" },
];
