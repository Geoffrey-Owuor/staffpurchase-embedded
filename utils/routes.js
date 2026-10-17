// Single source of truth for the role->dashboard relationship.
// Every role shares one route tree now, so this is just a validity check,
// not a lookup table - see utils/HandleActionClicks/useDashboardRoutes.js
// for the actual path builders.
export const VALID_ROLES = ["staff", "hr", "payroll", "cc", "bi", "admin"];

// Roles that submit their own purchase requests and see them like staff do
// (own table, own count cards). Admin is a requester with extra powers under
// /dashboard/admin - it is never part of the payroll -> hr -> cc -> bi chain.
export const REQUESTER_ROLES = ["staff", "admin"];

export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

export function isRequesterRole(role) {
  return REQUESTER_ROLES.includes(role);
}
