import pool from "@/lib/db";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/utils/Cache/cacheTags";

// Deliberately NOT a "use server" module: that would expose this as a server
// action any client could call, leaking role-targeted banners. Only
// app/api/banners/route.js (which filters by the session's role) uses it.

const toIso = (value) => (value ? new Date(value).toISOString() : null);

// Caches every active, not-yet-expired banner - including ones scheduled to
// start later - so the client can switch banners on/off at their exact
// starts_at/ends_at without waiting for this cache to revalidate.
export const CachedBanners = unstable_cache(
  async () => {
    try {
      const [rows] = await pool.execute(`
        SELECT id, message, severity, target_roles, starts_at, ends_at, updated_at
        FROM system_banners
        WHERE is_active = 1
          AND (ends_at IS NULL OR ends_at > NOW())
        ORDER BY priority DESC, starts_at DESC, id DESC`);

      // unstable_cache JSON-serializes its result, so convert Dates up front
      // to keep the cached and uncached shapes identical
      return rows.map((row) => ({
        id: row.id,
        message: row.message,
        severity: row.severity,
        targetRoles: row.target_roles
          ? row.target_roles
              .split(",")
              .map((role) => role.trim().toLowerCase())
              .filter(Boolean)
          : null,
        startsAt: toIso(row.starts_at),
        endsAt: toIso(row.ends_at),
        updatedAt: toIso(row.updated_at),
      }));
    } catch (error) {
      console.error("Error fetching system banners:", error);
      // Rethrow so a DB hiccup isn't cached as "no banners" - the route
      // catches this and returns an empty list for this request only
      throw error;
    }
  },
  ["system_banners"],
  { revalidate: 300, tags: [CACHE_TAGS.banners] },
);
