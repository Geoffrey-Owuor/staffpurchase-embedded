// Single source of truth for unstable_cache tags. Every cached loader tags
// itself with one of these, and /api/revalidate only accepts names from this
// list. Kept out of CachedConditions.js because "use server" modules may only
// export async functions.
export const CACHE_TAGS = {
  creditPeriods: "credit-periods",
  discountPolicies: "discount-policies",
  termsConditions: "terms-conditions",
  approverEmails: "approver-emails",
  changelogs: "changelogs",
  banners: "banners",
  invoicingLocations: "invoicing-locations",
  departments: "departments",
  appSettings: "app-settings",
};

export const VALID_CACHE_TAGS = Object.values(CACHE_TAGS);
