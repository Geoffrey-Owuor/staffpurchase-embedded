// app/api/admin/banners/route.js - dashboard banners (system_banners),
// managed from /dashboard/admin/banners. GET lists every banner (paginated,
// filterable); POST creates one. Edits/deletes: ./[id]/route.js. Helpers and
// validation: lib/adminBanners.js.
import { revalidateTag } from "next/cache";
import { withConnection, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import { CACHE_TAGS } from "@/utils/Cache/cacheTags";
import { BANNER_SEVERITY_OPTIONS } from "@/utils/Admin/adminConstants";
import {
  BANNER_COLUMNS,
  BANNER_ORDER,
  BANNER_STATUS_SQL,
  bannerLabel,
  bannerSnapshot,
  dbNow,
  handleBannerError,
  loadBanner,
  readBannerFields,
  readReason,
  toBanner,
  toColumns,
} from "@/lib/adminBanners";

const SEVERITIES = BANNER_SEVERITY_OPTIONS.map((option) => option.value);

export const GET = requireAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);

      const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("pageSize"), 10) || 10),
      );
      const offset = (page - 1) * pageSize;

      const search = searchParams.get("search") || "";
      const status = searchParams.get("status") || "";
      const severity = searchParams.get("severity") || "";

      const whereClauses = [];
      const params = [];

      if (search) {
        whereClauses.push(`b.message LIKE ?`);
        params.push(`%${search}%`);
      }
      if (BANNER_STATUS_SQL[status]) {
        whereClauses.push(`(${BANNER_STATUS_SQL[status]})`);
      }
      if (SEVERITIES.includes(severity)) {
        whereClauses.push(`b.severity = ?`);
        params.push(severity);
      }

      const whereSql =
        whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

      // pageSize/offset are clamped integers (see purchaseshistorydata for
      // why they're inlined rather than bound).
      const { rows, total } = await withConnection(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT ${BANNER_COLUMNS} FROM system_banners b${whereSql}
           ORDER BY ${BANNER_ORDER}
           LIMIT ${pageSize} OFFSET ${offset}`,
          params,
        );
        const [countResult] = await connection.execute(
          `SELECT COUNT(*) AS count FROM system_banners b${whereSql}`,
          params,
        );
        return { rows, total: countResult[0].count };
      });

      return Response.json({
        data: rows.map(toBanner),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      });
    } catch (error) {
      return handleBannerError(error, "Error loading banners");
    }
  },
  { roles: ["admin"] },
);

// Body: { message, severity, targetRoles, startsAt?, endsAt?, priority,
// isActive, reason? }. startsAt defaults to now; endsAt null = no end.
export const POST = requireAuth(
  async (request, { user: admin }) => {
    try {
      const body = await request.json();
      const reason = readReason(body.reason);

      const banner = await withTransaction(async (connection) => {
        const fields = readBannerFields(body, null, await dbNow(connection));
        const columns = toColumns(fields);
        const [result] = await connection.execute(
          `INSERT INTO system_banners
             (message, severity, target_roles, starts_at, ends_at, priority, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            columns.message,
            columns.severity,
            columns.target_roles,
            columns.starts_at,
            columns.ends_at,
            columns.priority,
            columns.is_active,
          ],
        );
        const created = await loadBanner(connection, result.insertId);

        await writeAdminAudit(connection, {
          admin,
          action: "banner.create",
          targetType: "banner",
          targetId: created.id,
          targetLabel: bannerLabel(created),
          reason,
          after: bannerSnapshot(created),
        });
        return created;
      });

      revalidateTag(CACHE_TAGS.banners);
      return Response.json(
        { message: "Banner created.", banner },
        { status: 201 },
      );
    } catch (error) {
      return handleBannerError(error, "Error creating the banner");
    }
  },
  { roles: ["admin"] },
);
