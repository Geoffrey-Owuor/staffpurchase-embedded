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
// All are admin actions except purchase.remove_products, which Credit Control
// writes when removing products at its approval stage (the admin_* columns
// then hold the CC user).
export const ADMIN_AUDIT_ACTIONS = {
  "user.update_profile": "Profile edited",
  "user.change_role": "Role changed",
  "user.deactivate": "Account deactivated",
  "user.reactivate": "Account reactivated",
  "user.unlock": "Account unlocked",
  "user.send_reset": "Reset link sent",
  "purchase.edit": "Request edited",
  "purchase.delete": "Request deleted",
  "purchase.remove_products": "Products removed (Credit Control)",
  "reference.create": "Reference data added",
  "reference.update": "Reference data changed",
  "setting.update": "Setting changed",
  "credit_window.create": "Extended credit window created",
  "credit_window.update": "Extended credit window changed",
  "banner.create": "Banner created",
  "banner.update": "Banner changed",
  "banner.delete": "Banner deleted",
  "promo.create": "Staff offer promo created",
  "promo.update": "Staff offer promo changed",
  "promo.deactivate": "Staff offer promo deactivated",
  "promo.reactivate": "Staff offer promo reactivated",
  "offer.add": "Staff offer product added",
  "offer.upload": "Staff offer products uploaded",
  "offer.deactivate": "Staff offer product deactivated",
  "offer.reactivate": "Staff offer product reactivated",
};

export const ADMIN_AUDIT_ACTION_OPTIONS = Object.entries(
  ADMIN_AUDIT_ACTIONS,
).map(([value, label]) => ({ value, label }));

export const ADMIN_AUDIT_TARGET_OPTIONS = [
  { value: "user", label: "Users" },
  { value: "purchase", label: "Purchase requests" },
  { value: "reference", label: "Reference data & settings" },
  { value: "banner", label: "Banners" },
  { value: "staff_offer", label: "Staff offers" },
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

// Credit periods (credit_periods) and extended credit windows
// (credit_extension_windows) - rules in lib/creditPeriods.js and
// lib/adminCreditPeriods.js. Periods are whole months.
export const CREDIT_PERIOD_MAX_MONTHS = 12;
export const CREDIT_PERIOD_LABEL_MAX_LENGTH = 255;
export const CREDIT_WINDOW_NAME_MAX_LENGTH = 150;

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

// Staff Offer promos (staff_offer_promos, managed at
// /dashboard/admin/staff-offers - rules in lib/adminStaffOffers.js).
// A promo that ended at most this many days ago can still be extended;
// older ones are duplicated into a new promo instead.
export const PROMO_EXTEND_GRACE_DAYS = 7;
// staff_offer_prices.promo_name mirrors the promo name and is VARCHAR(100)
export const PROMO_NAME_MAX_LENGTH = 100;
export const OFFER_PRODUCT_CODE_MAX_LENGTH = 64;
export const OFFER_PRICE_MAX = 99999999.99;
// Excel uploads (lib/staffOfferSheet.js)
export const OFFER_UPLOAD_MAX_ROWS = 5000;
export const OFFER_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const OFFER_UPLOAD_CODE_HEADER = "Product code";
export const OFFER_UPLOAD_PRICE_HEADER = "Offer price (KES)";
// Shown in the upload dialog and on the template's Instructions sheet
export const OFFER_UPLOAD_RULES = [
  `One product per row: "${OFFER_UPLOAD_CODE_HEADER}" and "${OFFER_UPLOAD_PRICE_HEADER}" on the first sheet, headers in row 1.`,
  "The offer price is the FINAL price staff pay - no discount is applied on top. Positive, at most 2 decimals.",
  "Product codes are the Orion item codes, without spaces. Keep the column formatted as Text so leading zeros stay.",
  "Each code may appear only once in the file, and not already be active in the promo you're adding to.",
  "The promo sets the period - the file has no dates.",
  `Up to ${OFFER_UPLOAD_MAX_ROWS.toLocaleString("en-KE")} products per file. Empty rows and extra columns are ignored.`,
  "Nothing is saved until you confirm the preview, and then all rows are saved together or none are.",
];

export const PROMO_STATUS_OPTIONS = [
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Scheduled" },
  { value: "ended", label: "Ended" },
  { value: "inactive", label: "Inactive" },
];

export const OFFER_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
