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

async function sendJson(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    // Extra fields the route sent, e.g. { code: "overlap", overlaps }
    error.data = data;
    throw error;
  }
  return data;
}

// One request for the admin editor: { purchase, products, version }
export function fetchAdminPurchase(id) {
  return getJson(
    `${basePath}/api/admin/purchases/${id}`,
    "Failed to load the request",
  );
}

// body: { version, reason, notifyRequester, reopenFromStage, purchase, products }
// Throws an Error with `status` (409 = changed since it was opened).
export function saveAdminPurchase(id, body) {
  return sendJson(`${basePath}/api/admin/purchases/${id}`, "PUT", body);
}

// body: { reason, notifyRequester }
export function deleteAdminPurchase(id, body) {
  return sendJson(`${basePath}/api/admin/purchases/${id}`, "DELETE", body);
}

// { locations, departments, settings } for the Reference Data page
export function fetchReferenceData() {
  return getJson(
    `${basePath}/api/admin/reference-data`,
    "Failed to load reference data",
  );
}

// POST = add an entry, PATCH = change one (see api/admin/reference-data).
// Resolves to { message, locations, departments, settings }.
export function saveReferenceData(method, body) {
  return sendJson(`${basePath}/api/admin/reference-data`, method, body);
}

// { periods, windows, promos, now } for the Reference Data page's credit
// periods section
export function fetchAdminCreditPeriods() {
  return getJson(
    `${basePath}/api/admin/credit-periods`,
    "Failed to load credit periods",
  );
}

// POST = add a period/window, PATCH = change one (see
// api/admin/credit-periods). Resolves to { message, ...the fresh data }.
export function saveAdminCreditPeriods(method, body) {
  return sendJson(`${basePath}/api/admin/credit-periods`, method, body);
}

// filters: { fromDate, toDate } - see api/admin/analytics
export function fetchAdminAnalytics(filters = {}) {
  return getJson(
    `${basePath}/api/admin/analytics?${toQueryString(filters)}`,
    "Failed to load analytics",
  );
}

// filters: { page, pageSize, search, status, severity } - see api/admin/banners
export function fetchAdminBanners(filters = {}) {
  return getJson(
    `${basePath}/api/admin/banners?${toQueryString(filters)}`,
    "Failed to load banners",
  );
}

// POST (no id) creates a banner; PATCH/DELETE with an id edit/delete one.
// Resolves to { message, banner? }.
export function saveAdminBanner(method, id, body) {
  const url = id
    ? `${basePath}/api/admin/banners/${id}`
    : `${basePath}/api/admin/banners`;
  return sendJson(url, method, body);
}

// filters: { page, pageSize, search, status, productCode } - see api/admin/staff-offers
export function fetchAdminPromos(filters = {}) {
  return getJson(
    `${basePath}/api/admin/staff-offers?${toQueryString(filters)}`,
    "Failed to load promos",
  );
}

export function fetchAdminPromo(id) {
  return getJson(
    `${basePath}/api/admin/staff-offers/${id}`,
    "Failed to load the promo",
  );
}

// filters: { page, pageSize, search, status }
export function fetchAdminPromoProducts(id, filters = {}) {
  return getJson(
    `${basePath}/api/admin/staff-offers/${id}/products?${toQueryString(filters)}`,
    "Failed to load the promo's products",
  );
}

// path: "" (POST = create a promo), "/<id>" (PATCH = promo action),
// "/<id>/products" (POST = add), "/<id>/products/<offerId>" (PATCH).
// Throws an Error with `status` and `data` (409 + data.code "overlap" =
// confirm and resend with confirmOverlap: true).
export function saveAdminPromo(method, path, body) {
  return sendJson(`${basePath}/api/admin/staff-offers${path}`, method, body);
}

// formData: see api/admin/staff-offers/upload. Resolves to { preview } or,
// on commit, { message, promo }; throws like sendJson (error.data carries
// `preview`, and `code: "overlap"` when confirmation is needed).
export async function uploadAdminOffers(formData) {
  const response = await fetch(`${basePath}/api/admin/staff-offers/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Upload failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

// Downloads an admin file (template/export) under the server's filename.
export async function downloadAdminFile(path, fallbackName) {
  const response = await fetch(`${basePath}${path}`);
  if (!response.ok) throw new Error("Download failed");
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
