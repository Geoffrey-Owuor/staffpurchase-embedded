// app/api/admin/audit-log/route.js - read-only view of admin_audit_log
import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_TARGET_OPTIONS,
} from "@/utils/Admin/adminConstants";

const TARGET_TYPES = ADMIN_AUDIT_TARGET_OPTIONS.map((option) => option.value);

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
      const action = searchParams.get("action") || "";
      const targetType = searchParams.get("targetType") || "";
      const targetId = searchParams.get("targetId") || "";
      const fromDate = searchParams.get("fromDate") || null;
      const toDate = searchParams.get("toDate") || null;

      const whereClauses = [];
      const params = [];

      // Matches the target (user email / PRQ reference) or the acting admin
      if (search) {
        whereClauses.push(
          `(target_label LIKE ? OR admin_email LIKE ? OR admin_name LIKE ?)`,
        );
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (ADMIN_AUDIT_ACTIONS[action]) {
        whereClauses.push(`action = ?`);
        params.push(action);
      }

      if (TARGET_TYPES.includes(targetType)) {
        whereClauses.push(`target_type = ?`);
        params.push(targetType);
      }

      // Exact target - used for one record's history
      if (targetId) {
        whereClauses.push(`target_id = ?`);
        params.push(targetId);
      }

      if (fromDate && toDate) {
        whereClauses.push(`DATE(created_at) BETWEEN ? AND ?`);
        params.push(fromDate, toDate);
      }

      const whereSql =
        whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

      // pageSize/offset are clamped integers - safe to inline.
      const dataQuery = `SELECT id, admin_id, admin_name, admin_email, action, target_type, target_id,
            target_label, reason, before_data, after_data, created_at
         FROM admin_audit_log${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT ${pageSize} OFFSET ${offset}`;
      const countQuery = `SELECT COUNT(*) AS count FROM admin_audit_log${whereSql}`;

      const { rows, total } = await withConnection(async (connection) => {
        const [rows] = await connection.execute(dataQuery, params);
        const [countResult] = await connection.execute(countQuery, params);
        return { rows, total: countResult[0].count };
      });

      return Response.json({
        data: rows,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      });
    } catch (error) {
      console.error("Admin audit log error:", error);
      return Response.json(
        { message: "Error loading the audit log" },
        { status: 500 },
      );
    }
  },
  { roles: ["admin"] },
);
