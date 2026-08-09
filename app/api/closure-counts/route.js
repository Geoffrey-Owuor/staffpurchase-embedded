import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

// Builds the extra, additive WHERE fragment shared with the Payment Tracking
// table's filters. `requestClosure` is deliberately excluded - it's the same
// dimension the open/closed counts themselves represent, so filtering by it
// would make one of the two counts tautologically zero.
function buildExtraFilterClause(searchParams) {
  const clauses = [];
  const params = [];

  const search = searchParams.get("search");
  if (search) {
    clauses.push(`staffName LIKE ?`);
    params.push(`%${search}%`);
  }

  const referenceNumber = searchParams.get("referenceNumber");
  if (referenceNumber) {
    clauses.push(`reference_number = ?`);
    params.push(referenceNumber);
  }

  const payrollNumber = searchParams.get("payrollNumber");
  if (payrollNumber) {
    clauses.push(`payrollNo = ?`);
    params.push(payrollNumber);
  }

  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  if (fromDate && toDate) {
    clauses.push(`DATE(createdAt) BETWEEN ? AND ?`);
    params.push(fromDate, toDate);
  }

  const paymentTerms = searchParams.get("paymentTerms");
  if (paymentTerms) {
    clauses.push(`employee_payment_terms = ?`);
    params.push(paymentTerms);
  }

  const monthPeriod = searchParams.get("monthPeriod");
  if (monthPeriod) {
    clauses.push(`user_credit_period = ?`);
    params.push(Number(monthPeriod));
  }

  return {
    sql: clauses.length > 0 ? ` AND ${clauses.join(" AND ")}` : "",
    params,
  };
}

export const GET = requireAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const extraFilter = buildExtraFilterClause(searchParams);

      const openQuery = `SELECT COUNT(*) as count FROM purchasesinfo
              WHERE BI_Approval = 'approved' AND request_closure = 'open'${extraFilter.sql}`;
      const closedQuery = `SELECT COUNT(*) as count FROM purchasesinfo
                WHERE BI_Approval = 'approved' AND request_closure = 'closed'${extraFilter.sql}`;
      const approvedQuery = `SELECT COUNT(*) as count FROM purchasesinfo
                  WHERE BI_Approval = 'approved'${extraFilter.sql}`;

      const { openResult, closedResult, approvedResult } = await withConnection(
        async (connection) => {
          const openPromise = connection.execute(openQuery, extraFilter.params);
          const closedPromise = connection.execute(closedQuery, extraFilter.params);
          const approvedPromise = connection.execute(
            approvedQuery,
            extraFilter.params,
          );

          const [[openResult], [closedResult], [approvedResult]] =
            await Promise.all([openPromise, closedPromise, approvedPromise]);

          return { openResult, closedResult, approvedResult };
        },
      );

      //Returning the combined result
      return Response.json({
        open: openResult[0].count,
        closed: closedResult[0].count,
        approved: approvedResult[0].count,
      });
    } catch (error) {
      console.error("Error fetching closure counts:", error);
      return Response.json(
        { message: "Failed to fetch closure counts" },
        { status: 500 },
      );
    }
  },
  { roles: ["cc", "bi"] },
);
