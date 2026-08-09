// Single source of truth for the role->dashboard relationship.
// Every role shares one route tree now, so this is just a validity check,
// not a lookup table - see utils/HandleActionClicks/useDashboardRoutes.js
// for the actual path builders.
export const VALID_ROLES = ["staff", "hr", "payroll", "cc", "bi"];

export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}
