import "server-only";

// The one place deployment-specific values are read from the environment:
// the ERP price service (URLs, credentials, request parameters) and the
// support contact. None of it lives in code, and `server-only` makes any
// client import of this module a build error, so the values can't end up in
// a browser bundle.

const ERP_ENV = {
  authUrl: "ERP_AUTH_URL",
  priceUrl: "ERP_PRICE_URL",
  apiKey: "ERP_API_KEY",
  tenantType: "ERP_TENANT_TYPE",
  priceApiCode: "ERP_PRICE_API_CODE",
  userId: "ERP_USER_ID",
  langCode: "ERP_LANG_CODE",
  companyCode: "ERP_COMPANY_CODE",
  itemCompanyCode: "ERP_ITEM_COMPANY_CODE",
};

export class MissingConfigError extends Error {}

// Read at call time rather than module load, so `next build` works without
// the ERP variables and a missing one fails only the price lookup (with a
// message naming it) instead of the whole server.
export function getErpConfig() {
  const config = {};
  const missing = [];
  for (const [key, name] of Object.entries(ERP_ENV)) {
    const value = process.env[name]?.trim();
    if (value) config[key] = value;
    else missing.push(name);
  }
  if (missing.length) {
    throw new MissingConfigError(
      `Price service not configured, missing: ${missing.join(", ")}`,
    );
  }
  return config;
}

// Empty when unset - callers hide the support link rather than show a
// placeholder address.
export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL?.trim() || "";
}
