// app/api/admin/banners/[id]/route.js - edit (PATCH) or delete (DELETE) one
// dashboard banner. See lib/adminBanners.js for the rules.
import { revalidateTag } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import { CACHE_TAGS } from "@/utils/Cache/cacheTags";
import {
  bannerLabel,
  bannerSnapshot,
  loadBanner,
  readBannerFields,
  toColumns,
} from "@/lib/adminBanners";
import {
  RouteError,
  dbNow,
  handleRouteError,
  readReason,
} from "@/lib/adminForm";

// Body: any of { message, severity, targetRoles, startsAt, endsAt, priority,
// isActive }, plus { reshow?, reason? }.
//
// Users dismiss info/warning banners per updated_at (SystemBanners), and the
// column bumps itself on any UPDATE. So it only moves when the wording or
// severity changes, or `reshow` asks for it - toggling, extending or
// re-targeting a banner doesn't bring it back for people who closed it.
export const PATCH = requireAuth(
  async (request, { params, user: admin }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const reason = readReason(body.reason);

      const { banner, reshown } = await withTransaction(async (connection) => {
        const current = await loadBanner(connection, id, { lock: true });
        const fields = readBannerFields(body, current, await dbNow(connection));
        const before = bannerSnapshot(current);
        const columns = toColumns(fields);

        const contentChanged =
          fields.message !== current.message ||
          fields.severity !== current.severity;
        const reshown = contentChanged || body.reshow === true;
        const changed =
          JSON.stringify(before) !==
          JSON.stringify(bannerSnapshot({ ...current, ...fields }));
        if (!changed && !reshown) {
          throw new RouteError(400, "No changes to save");
        }

        await connection.execute(
          `UPDATE system_banners
           SET message = ?, severity = ?, target_roles = ?, starts_at = ?,
               ends_at = ?, priority = ?, is_active = ?,
               updated_at = ${reshown ? "CURRENT_TIMESTAMP" : "updated_at"}
           WHERE id = ?`,
          [
            columns.message,
            columns.severity,
            columns.target_roles,
            columns.starts_at,
            columns.ends_at,
            columns.priority,
            columns.is_active,
            current.id,
          ],
        );
        const updated = await loadBanner(connection, current.id);

        await writeAdminAudit(connection, {
          admin,
          action: "banner.update",
          targetType: "banner",
          targetId: updated.id,
          targetLabel: bannerLabel(updated),
          reason,
          before,
          after: { ...bannerSnapshot(updated), reshown },
        });
        return { banner: updated, reshown };
      });

      revalidateTag(CACHE_TAGS.banners);
      return Response.json({
        message: reshown
          ? "Banner saved. Users who had dismissed it will see it again."
          : "Banner saved.",
        banner,
      });
    } catch (error) {
      return handleRouteError(error, "Error saving the banner");
    }
  },
  { roles: ["admin"] },
);

// Only before the banner starts - nobody can have seen it yet. A banner
// that has started is deactivated instead, so the record stays.
export const DELETE = requireAuth(
  async (request, { params, user: admin }) => {
    try {
      const { id } = await params;
      const body = await request.json().catch(() => ({}));
      const reason = readReason(body.reason);

      await withTransaction(async (connection) => {
        const current = await loadBanner(connection, id, { lock: true });
        if (!current.canDelete) {
          throw new RouteError(
            409,
            "This banner has already started - deactivate it instead",
          );
        }
        await connection.execute(`DELETE FROM system_banners WHERE id = ?`, [
          current.id,
        ]);
        await writeAdminAudit(connection, {
          admin,
          action: "banner.delete",
          targetType: "banner",
          targetId: current.id,
          targetLabel: bannerLabel(current),
          reason,
          before: bannerSnapshot(current),
        });
      });

      revalidateTag(CACHE_TAGS.banners);
      return Response.json({ message: "Banner deleted." });
    } catch (error) {
      return handleRouteError(error, "Error deleting the banner");
    }
  },
  { roles: ["admin"] },
);
