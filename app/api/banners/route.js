import { requireAuth } from "@/lib/apiAuth";
import { CachedBanners } from "@/utils/Cache/CachedBanners";

// Banners for the current user's role. Rows come from the system_banners
// table (managed directly in MySQL - see
// db/migrations/2026-10-14_create_system_banners.sql). Includes banners
// scheduled to start later; the client hides them until starts_at.
async function handler(_request, { user }) {
  try {
    const banners = await CachedBanners();

    const visible = banners
      .filter(
        (banner) => !banner.targetRoles || banner.targetRoles.includes(user.role),
      )
      .map(({ targetRoles, ...banner }) => ({
        ...banner,
        dismissible: banner.severity !== "critical",
      }));

    return Response.json(visible, { status: 200 });
  } catch (error) {
    // Banners are non-essential - never break the dashboard over them
    console.error("Error loading banners:", error);
    return Response.json([], { status: 200 });
  }
}

export const GET = requireAuth(handler);
