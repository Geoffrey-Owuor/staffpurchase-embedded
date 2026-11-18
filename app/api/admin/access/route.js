// app/api/admin/access/route.js - who holds each access area
// (utils/permissions.js) for the admin Access page. Grants and revokes go
// through PATCH /api/admin/users/[id] (grant_permission/revoke_permission),
// so they're audited in one place.
import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { PERMISSIONS, PERMISSION_KEYS } from "@/utils/permissions";

export const GET = requireAuth(
  async () => {
    try {
      const { grants, admins } = await withConnection(async (connection) => {
        const [grants] = await connection.execute(
          `SELECT up.permission, up.granted_at, u.id, u.name, u.email, u.role,
                  u.department, u.is_active, g.name AS granted_by_name
           FROM user_permissions up
           JOIN users u ON u.id = up.user_id
           LEFT JOIN users g ON g.id = up.granted_by
           ORDER BY u.name ASC, u.id ASC`,
        );
        const [admins] = await connection.execute(
          `SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1`,
        );
        return { grants, admins: admins[0].count };
      });

      return Response.json({
        // Admins hold every permission without rows; shown as a count
        activeAdmins: Number(admins),
        permissions: PERMISSION_KEYS.map((key) => ({
          key,
          ...PERMISSIONS[key],
          holders: grants
            .filter((grant) => grant.permission === key)
            .map(({ permission, ...holder }) => holder),
        })),
      });
    } catch (error) {
      console.error("Admin access list error:", error);
      return Response.json(
        { message: "Error loading access" },
        { status: 500 },
      );
    }
  },
  { roles: ["admin"] },
);
