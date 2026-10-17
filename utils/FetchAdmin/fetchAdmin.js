import { basePath } from "@/public/assets";

// Admin page fetchers. Admin filters aren't purchase filters, so they don't
// go through buildPurchaseQueryParams - this keeps the same rule (only
// defined, non-empty values become params).
function toQueryString(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params.toString();
}

async function getJson(url, errorMessage) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(errorMessage);
  return response.json();
}

// filters: { page, pageSize, search, role, status, department }
// Returns the server envelope: { data, page, pageSize, total, totalPages }
export function fetchAdminUsers(filters = {}) {
  return getJson(
    `${basePath}/api/admin/users?${toQueryString(filters)}`,
    "Failed to fetch users",
  );
}

// filters: { page, pageSize, search, action, targetType, targetId, fromDate, toDate }
export function fetchAdminAuditLog(filters = {}) {
  return getJson(
    `${basePath}/api/admin/audit-log?${toQueryString(filters)}`,
    "Failed to fetch the audit log",
  );
}

// Runs one admin action on a user. Resolves to the server's JSON
// ({ message, warning?, user }) and throws an Error carrying that message
// (and `user`, when the server still sent one) on a non-2xx response.
export async function runAdminUserAction(userId, body) {
  const response = await fetch(`${basePath}/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Action failed");
    error.user = data.user;
    throw error;
  }
  return data;
}
