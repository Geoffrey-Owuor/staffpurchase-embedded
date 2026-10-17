// app/api/admin/analytics/route.js - figures for the admin Analytics page.
// Request metrics honour ?fromDate&toDate (YYYY-MM-DD, on createdAt); user
// metrics are always all-time (an account isn't "in" a date range).
import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { MAX_LOGIN_ATTEMPTS } from "@/lib/loginPolicy";
import { APPROVAL_STAGES } from "@/utils/Approvals/approvalStages";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Request value = the sum of its line items' discounted values.
const REQUEST_VALUE = `(SELECT COALESCE(SUM(pp.discountedValue), 0)
  FROM purchase_products pp WHERE pp.purchase_id = p.id)`;

const toNumber = (value) => Number(value ?? 0);
const round = (value, digits = 1) =>
  value == null
    ? null
    : Math.round(Number(value) * 10 ** digits) / 10 ** digits;

// Every month from `start` to `end` (YYYY-MM), so empty months chart as 0.
function monthRange(start, end) {
  const months = [];
  const cursor = new Date(
    Number(start.slice(0, 4)),
    Number(start.slice(5, 7)) - 1,
    1,
  );
  const last = new Date(
    Number(end.slice(0, 4)),
    Number(end.slice(5, 7)) - 1,
    1,
  );
  while (cursor <= last && months.length < 120) {
    months.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

// YYYY-MM of the month `n` months before this one (0 = this month)
const monthsAgo = (n) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const thisMonth = () => monthsAgo(0);

export const GET = requireAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const fromDate = searchParams.get("fromDate");
      const toDate = searchParams.get("toDate");
      const hasRange =
        DATE_PATTERN.test(fromDate ?? "") && DATE_PATTERN.test(toDate ?? "");

      const rangeSql = hasRange ? ` AND DATE(p.createdAt) BETWEEN ? AND ?` : "";
      const rangeParams = hasRange ? [fromDate, toDate] : [];
      // purchasesinfo aliased as p in every request query below
      const requests = (sql, extraParams = []) => [
        sql.replace("/*RANGE*/", rangeSql),
        [...rangeParams, ...extraParams],
      ];

      // A stage is waiting when it's pending and every earlier stage approved
      const waitingCases = APPROVAL_STAGES.map((stage, index) => {
        const earlier = APPROVAL_STAGES.slice(0, index)
          .map((s) => `p.${s.approvalField} = 'approved'`)
          .concat(`p.${stage.approvalField} = 'pending'`)
          .join(" AND ");
        return `SUM(${earlier}) AS waiting_${stage.key},
                SUM(p.${stage.approvalField} = 'declined') AS declined_${stage.key}`;
      }).join(",\n");

      // Days each stage took: from submission (payroll) or from the previous
      // stage's decision. Cash requests' automatic payroll approval is left
      // out - it isn't a human turnaround.
      const durationCases = APPROVAL_STAGES.map((stage, index) => {
        const startColumn =
          index === 0
            ? "p.createdAt"
            : `p.${APPROVAL_STAGES[index - 1].prefix}_approval_date`;
        const endColumn = `p.${stage.prefix}_approval_date`;
        const extra =
          stage.key === "payroll"
            ? ` AND COALESCE(p.payroll_approver_name, '') <> 'auto approval'`
            : "";
        const condition = `${endColumn} IS NOT NULL AND ${startColumn} IS NOT NULL
          AND p.${stage.approvalField} IN ('approved', 'declined')${extra}`;
        return `AVG(CASE WHEN ${condition}
                  THEN TIMESTAMPDIFF(MINUTE, ${startColumn}, ${endColumn}) / 1440 END) AS days_${stage.key},
                SUM(CASE WHEN ${condition} THEN 1 ELSE 0 END) AS n_${stage.key}`;
      }).join(",\n");

      const anyDeclined = APPROVAL_STAGES.map(
        (s) => `p.${s.approvalField} = 'declined'`,
      ).join(" OR ");

      const result = await withConnection(async (connection) => {
        const run = async ([sql, params]) =>
          (await connection.execute(sql, params))[0];
        const runPlain = async (sql, params = []) =>
          (await connection.execute(sql, params))[0];

        // ---- Users (all-time)
        const [userTotals] = await runPlain(
          `SELECT COUNT(*) AS total,
             SUM(is_active = 1 AND password_attempts < ${MAX_LOGIN_ATTEMPTS}) AS active,
             SUM(is_active = 1 AND password_attempts >= ${MAX_LOGIN_ATTEMPTS}) AS locked,
             SUM(is_active = 0) AS deactivated
           FROM users`,
        );
        const usersByRole = await runPlain(
          `SELECT role AS label, COUNT(*) AS count FROM users GROUP BY role ORDER BY count DESC, role`,
        );
        const usersByDepartment = await runPlain(
          `SELECT COALESCE(NULLIF(department, ''), 'Not set') AS label, COUNT(*) AS count
           FROM users GROUP BY label ORDER BY count DESC, label`,
        );
        const registrations = await runPlain(
          `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
           FROM users WHERE created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
           GROUP BY month`,
        );

        // ---- Requests (date range)
        const [requestTotals] = await run(
          requests(
            `SELECT COUNT(*) AS total,
               SUM(p.BI_Approval = 'approved') AS approved,
               SUM(${anyDeclined}) AS declined,
               SUM(p.BI_Approval = 'pending' AND NOT (${anyDeclined})) AS inProgress,
               COALESCE(SUM(${REQUEST_VALUE}), 0) AS value,
               SUM(p.BI_Approval = 'approved' AND p.request_closure = 'closed') AS closed,
               SUM(p.BI_Approval = 'approved' AND COALESCE(p.request_closure, 'open') <> 'closed') AS awaitingClosure,
               ${waitingCases},
               ${durationCases},
               MIN(DATE_FORMAT(p.createdAt, '%Y-%m')) AS firstMonth
             FROM purchasesinfo p WHERE 1=1 /*RANGE*/`,
          ),
        );

        const byMonthRows = await run(
          requests(
            `SELECT DATE_FORMAT(p.createdAt, '%Y-%m') AS month, COUNT(*) AS count,
               COALESCE(SUM(${REQUEST_VALUE}), 0) AS value
             FROM purchasesinfo p WHERE 1=1 /*RANGE*/ GROUP BY month`,
          ),
        );
        const groupBy = (column, labelSql = column) =>
          run(
            requests(
              `SELECT ${labelSql} AS label, COUNT(*) AS count,
                 COALESCE(SUM(${REQUEST_VALUE}), 0) AS value
               FROM purchasesinfo p WHERE 1=1 /*RANGE*/
               GROUP BY label ORDER BY value DESC, count DESC`,
            ),
          );
        const byDepartment = await groupBy(
          "p.department",
          "COALESCE(NULLIF(p.department, ''), 'Not set')",
        );
        const byPaymentTerms = await groupBy(
          "p.employee_payment_terms",
          "COALESCE(p.employee_payment_terms, 'Not set')",
        );
        const byLocation = await groupBy(
          "p.invoicing_location",
          `COALESCE((SELECT l.label FROM invoicing_locations l WHERE l.code = p.invoicing_location),
                    NULLIF(p.invoicing_location, ''), 'Not set')`,
        );

        // ---- Products (line items of requests in range)
        const productQuery = (select, groupOrder) =>
          run(
            requests(
              `SELECT ${select}
               FROM purchase_products pp JOIN purchasesinfo p ON p.id = pp.purchase_id
               WHERE 1=1 /*RANGE*/ ${groupOrder}`,
            ),
          );
        const topProducts = await productQuery(
          `pp.productCode AS code, MAX(pp.itemName) AS label, COUNT(*) AS count,
           COALESCE(SUM(pp.discountedValue), 0) AS value`,
          `GROUP BY pp.productCode ORDER BY count DESC, value DESC LIMIT 10`,
        );
        const priceBasis = await productQuery(
          `pp.priceCode AS label, COUNT(*) AS count, COALESCE(SUM(pp.discountedValue), 0) AS value`,
          `GROUP BY pp.priceCode ORDER BY count DESC`,
        );
        const itemStatus = await productQuery(
          `COALESCE(pp.itemStatus, 'Not set') AS label, COUNT(*) AS count,
           COALESCE(SUM(pp.discountedValue), 0) AS value`,
          `GROUP BY label ORDER BY count DESC`,
        );

        return {
          userTotals,
          usersByRole,
          usersByDepartment,
          registrations,
          requestTotals,
          byMonthRows,
          byDepartment,
          byPaymentTerms,
          byLocation,
          topProducts,
          priceBasis,
          itemStatus,
        };
      });

      const t = result.requestTotals;
      const counted = (rows) =>
        rows.map((row) => ({
          ...row,
          count: toNumber(row.count),
          ...(row.value !== undefined ? { value: toNumber(row.value) } : {}),
        }));

      // Monthly series cover the whole range, empty months included
      const endMonth = hasRange ? toDate.slice(0, 7) : thisMonth();
      const startMonth = hasRange
        ? fromDate.slice(0, 7)
        : (t.firstMonth ?? endMonth);
      const byMonth = monthRange(startMonth, endMonth).map((month) => {
        const row = result.byMonthRows.find((r) => r.month === month);
        return {
          month,
          count: toNumber(row?.count),
          value: toNumber(row?.value),
        };
      });
      // Registrations: the last 12 months, this one included
      const registrationsByMonth = monthRange(monthsAgo(11), thisMonth()).map(
        (month) => ({
          month,
          count: toNumber(
            result.registrations.find((r) => r.month === month)?.count,
          ),
        }),
      );

      return Response.json({
        range: hasRange ? { fromDate, toDate } : null,
        users: {
          total: toNumber(result.userTotals.total),
          active: toNumber(result.userTotals.active),
          locked: toNumber(result.userTotals.locked),
          deactivated: toNumber(result.userTotals.deactivated),
          byRole: counted(result.usersByRole),
          byDepartment: counted(result.usersByDepartment),
          registrationsByMonth,
        },
        requests: {
          total: toNumber(t.total),
          inProgress: toNumber(t.inProgress),
          approved: toNumber(t.approved),
          declined: toNumber(t.declined),
          value: toNumber(t.value),
          closed: toNumber(t.closed),
          awaitingClosure: toNumber(t.awaitingClosure),
          stages: APPROVAL_STAGES.map((stage) => ({
            key: stage.key,
            label: stage.label,
            waiting: toNumber(t[`waiting_${stage.key}`]),
            declined: toNumber(t[`declined_${stage.key}`]),
            avgDays: round(t[`days_${stage.key}`]),
            decided: toNumber(t[`n_${stage.key}`]),
          })),
          byMonth,
          byDepartment: counted(result.byDepartment),
          byPaymentTerms: counted(result.byPaymentTerms),
          byLocation: counted(result.byLocation),
        },
        products: {
          top: counted(result.topProducts),
          priceBasis: counted(result.priceBasis),
          itemStatus: counted(result.itemStatus),
        },
      });
    } catch (error) {
      console.error("Admin analytics error:", error);
      return Response.json(
        { message: "Error loading analytics" },
        { status: 500 },
      );
    }
  },
  { roles: ["admin"] },
);
