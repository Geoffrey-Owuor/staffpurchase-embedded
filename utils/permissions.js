// Access areas an admin can grant to individual users on top of their role
// (user_permissions table, db/migrations/2026-11-18_user_permissions.sql).
// Client-safe - no server imports. Admins hold every permission implicitly.
//
// To add an access area: add a key here, gate its page with
// `userHasPermission` (lib/permissions.js) in its layout.js and its API with
// `requireAuth(handler, { permission })`, and show its nav entry when
// `hasPermission(user, key)`. The admin Users modal and Access page list
// every key here automatically - no schema change needed.
export const PERMISSIONS = {
  "analytics.view": {
    label: "Analytics",
    description:
      "View the Analytics dashboard: request counts, values, the approval pipeline, products and user account figures.",
  },
};

export const PERMISSION_KEYS = Object.keys(PERMISSIONS);

export const PERMISSION_OPTIONS = PERMISSION_KEYS.map((key) => ({
  value: key,
  label: PERMISSIONS[key].label,
}));

export const isValidPermission = (key) =>
  Object.prototype.hasOwnProperty.call(PERMISSIONS, key);

// For the client: the dashboard layout puts the user's effective permissions
// (every key for an admin) on the UserContext user as `permissions`. This only
// decides what's shown - pages and APIs check the DB themselves.
export const hasPermission = (user, key) =>
  user?.role === "admin" || !!user?.permissions?.includes(key);
