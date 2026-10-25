"use server";
import pool from "@/lib/db";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/utils/Cache/cacheTags";
import { APP_SETTINGS } from "@/utils/Admin/adminConstants";

// Caching Terms & Conditions
export const CachedConditions = unstable_cache(
  async () => {
    try {
      // Using pool.execute() as this is a single, self-contained read query
      const [rows] = await pool.execute(
        `SELECT condition_id, condition_description
         FROM terms_conditions
         ORDER by condition_id ASC`,
      );
      return rows;
    } catch (error) {
      console.error("Database Error: Failed to fetch conditions:", error);
      // Returning an empty array as a fallback
      return [];
    }
  },
  ["all_conditions"], // Unique key for this particular cache
  // Revalidate every 1hr (3600 seconds), or on demand via /api/revalidate
  { revalidate: 3600, tags: [CACHE_TAGS.termsConditions] },
);

// Caching discount policies
export const CachedPolicies = unstable_cache(
  async () => {
    try {
      // Using pool.execute()
      const [policies] = await pool.execute(`
        SELECT policy_name, category, rate 
        FROM discountpolicies
        ORDER BY id ASC
        `);

      return policies;
    } catch (error) {
      console.error("Error fetching discount policies: ", error);
      // Empty fallback array
      return [];
    }
  },
  ["all_policies"],
  { revalidate: 3600, tags: [CACHE_TAGS.discountPolicies] },
);

// Caching credit periods - every one, active or not, for labels and filters
// over existing requests. What a NEW request may choose depends on the
// extended credit windows, which aren't cached (lib/creditPeriods.js).
export const CachedPeriods = unstable_cache(
  async () => {
    try {
      // Using pool.execute()
      const [periods] = await pool.execute(`
      SELECT period_value, period_description, is_active, requires_extension
      FROM credit_periods
      ORDER BY period_value ASC`);

      return periods.map((period) => ({
        ...period,
        is_active: Boolean(period.is_active),
        requires_extension: Boolean(period.requires_extension),
      }));
    } catch (error) {
      console.error("Error fetching credit periods:", error);
      // Fallback empty array
      return [];
    }
  },
  ["all_periods"],
  { revalidate: 3600, tags: [CACHE_TAGS.creditPeriods] },
);

// Caching Approver Emails
export const CachedEmails = unstable_cache(
  async () => {
    try {
      // Using pool.execute()
      const [emails] = await pool.execute(`
      SELECT approver_email, approver_role, approver_description
      FROM approver_emails 
      ORDER BY id ASC`);

      return emails;
    } catch (error) {
      console.error("Error fetching approver emails:", error);
      // Rethrow rather than returning [] - unstable_cache would cache the empty
      // fallback for an hour, and callers index into this array positionally,
      // so every notification would fail until revalidation. Callers (the
      // email handlers) already catch and log.
      throw error;
    }
  },
  ["all_approver_emails"],
  { revalidate: 3600, tags: [CACHE_TAGS.approverEmails] },
);

// Reference data managed from /dashboard/admin/reference-data
// (db/migrations/2026-10-18_reference_data.sql). Errors are rethrown, not
// swallowed into [] - unstable_cache would cache the empty fallback for an
// hour and every dropdown would come up empty.

// Every location, active or not - inactive ones still label older requests.
export const CachedInvoicingLocations = unstable_cache(
  async () => {
    const [rows] = await pool.execute(
      `SELECT code, label, is_active, sort_order
       FROM invoicing_locations
       ORDER BY sort_order ASC, label ASC`,
    );
    return rows.map((row) => ({ ...row, is_active: Boolean(row.is_active) }));
  },
  ["all_invoicing_locations"],
  { revalidate: 3600, tags: [CACHE_TAGS.invoicingLocations] },
);

// Every department, active or not - inactive ones are kept for existing users.
export const CachedDepartments = unstable_cache(
  async () => {
    const [rows] = await pool.execute(
      `SELECT id, name, is_active, sort_order
       FROM departments
       ORDER BY sort_order ASC, name ASC`,
    );
    return rows.map((row) => ({ ...row, is_active: Boolean(row.is_active) }));
  },
  ["all_departments"],
  { revalidate: 3600, tags: [CACHE_TAGS.departments] },
);

// Whitelisted app_settings as { key: value } (APP_SETTINGS in
// utils/Admin/adminConstants.js) - anything else in the table is ignored.
export const CachedAppSettings = unstable_cache(
  async () => {
    const keys = Object.keys(APP_SETTINGS);
    const [rows] = await pool.query(
      `SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (?)`,
      [keys],
    );
    return Object.fromEntries(
      rows.map((row) => [row.setting_key, row.setting_value]),
    );
  },
  ["app_settings"],
  { revalidate: 3600, tags: [CACHE_TAGS.appSettings] },
);
