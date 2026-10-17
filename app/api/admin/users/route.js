// app/api/admin/users/route.js - admin user directory (paginated, filterable)
import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { MAX_LOGIN_ATTEMPTS } from "@/lib/loginPolicy";
import { isValidRole } from "@/utils/routes";

// Status as the admin pages define it (utils/Admin/adminConstants.js).
// MAX_LOGIN_ATTEMPTS is a code constant, so inlining it is safe.
const STATUS_CLAUSES = {
  active: `u.is_active = 1 AND u.password_attempts < ${MAX_LOGIN_ATTEMPTS}`,
  locked: `u.is_active = 1 AND u.password_attempts >= ${MAX_LOGIN_ATTEMPTS}`,
  deactivated: `u.is_active = 0`,
};

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
      const role = searchParams.get("role") || "";
      const status = searchParams.get("status") || "";
      const department = searchParams.get("department") || "";

      const whereClauses = [];
      const params = [];

      if (search) {
        whereClauses.push(
          `(u.name LIKE ? OR u.email LIKE ? OR u.payrollNo LIKE ?)`,
        );
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (role && isValidRole(role)) {
        whereClauses.push(`u.role = ?`);
        params.push(role);
      }

      if (STATUS_CLAUSES[status]) {
        whereClauses.push(STATUS_CLAUSES[status]);
      }

      if (department) {
        whereClauses.push(`u.department LIKE ?`);
        params.push(`%${department}%`);
      }

      const whereSql =
        whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

      // pageSize/offset are clamped integers (see purchaseshistorydata for
      // why they're inlined rather than bound).
      const dataQuery = `SELECT u.id, u.name, u.email, u.role, u.payrollNo, u.department,
            u.is_active, u.password_attempts, u.created_at,
            (SELECT COUNT(*) FROM purchasesinfo p WHERE p.user_id = u.id) AS requestCount
         FROM users u${whereSql}
         ORDER BY u.name ASC, u.id ASC
         LIMIT ${pageSize} OFFSET ${offset}`;
      const countQuery = `SELECT COUNT(*) AS count FROM users u${whereSql}`;

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
      console.error("Admin users list error:", error);
      return Response.json(
        { message: "Error loading users" },
        { status: 500 },
      );
    }
  },
  { roles: ["admin"] },
);
