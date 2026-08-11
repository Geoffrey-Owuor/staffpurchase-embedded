//NEW REUSABLE APPROVAL COUNTS QUERY FOR ALL ROLES (staff, hr, cc, bi)
import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

// Total requests query - always global/unfiltered, these are fixed reference totals.
const totalQuery = `SELECT COUNT(*) as count FROM purchasesinfo`;
const totalApprovedQuery = `SELECT COUNT(*) as count FROM purchasesinfo WHERE BI_Approval = 'approved'`;
const totalDeclinedQuery = `SELECT COUNT(*) as count FROM purchasesinfo
                            WHERE Payroll_Approval = 'declined' OR HR_Approval = 'declined' OR
                            CC_Approval = 'declined' OR BI_Approval = 'declined'`;

const ROLE_QUERY_CONFIGS = {
  bi: {
    approvalField: "BI_Approval",
    approverIdField: "bi_approver_id",
  },
  cc: {
    approvalField: "CC_Approval",
    approverIdField: "cc_approver_id",
  },
  hr: {
    approvalField: "HR_Approval",
    approverIdField: "hr_approver_id",
  },
  payroll: {
    approvalField: "Payroll_Approval",
    approverIdField: "payroll_approver_id",
  },

  // Staff functions - they see the approval status of their submitted requests
  staff: {
    getPendingQuery: (userId) => ({
      sql: `SELECT COUNT(*) as count FROM purchasesinfo
            WHERE user_id = ?
            AND BI_Approval = 'pending'
            AND CC_Approval <> 'declined'
            AND HR_Approval <> 'declined'
            AND Payroll_Approval <> 'declined'`,
      params: [userId],
    }),
    getDeclinedQuery: (userId) => ({
      sql: `SELECT COUNT(*) as count FROM purchasesinfo
            WHERE user_id = ? AND (
            BI_Approval = 'declined' OR
            HR_Approval = 'declined' OR
            CC_Approval = 'declined' OR
            Payroll_Approval = 'declined')`,
      params: [userId],
    }),
    getApprovedQuery: (userId) => ({
      sql: `SELECT COUNT(*) as count FROM purchasesinfo
            WHERE user_id = ?
            AND BI_Approval = 'approved'
            AND CC_Approval <> 'declined'
            AND HR_Approval <> 'declined'
            AND Payroll_Approval <> 'declined'`,
      params: [userId],
    }),
  },
};

//Generate SQL query configs for approver roles
function getApproverQueryConfigs(role, approvalField, approverIdField, userId) {
  // The dependency chain
  // A role only sees a request when the previous person has approved it
  let prerequisiteClause = "";

  switch (role) {
    case "hr":
      prerequisiteClause = "AND Payroll_Approval = 'approved'";
      break;
    case "cc":
      prerequisiteClause = "AND HR_Approval = 'approved'";
      break;
    case "bi":
      prerequisiteClause = "AND CC_Approval = 'approved'";
      break;
    case "payroll":
      prerequisiteClause = "";
      break;
    default:
      prerequisiteClause = "";
  }

  return {
    pending: {
      sql: `SELECT COUNT(*) as count FROM purchasesinfo
            WHERE ${approvalField} = 'pending'
            ${prerequisiteClause}`,
      params: [],
    },
    declined: {
      sql: `SELECT COUNT(*) as count FROM purchasesinfo
            WHERE ${approvalField} = 'declined' AND ${approverIdField} = ?`,
      params: [userId],
    },
    approved: {
      sql: `SELECT COUNT(*) as count FROM purchasesinfo
            WHERE ${approvalField} = 'approved' AND ${approverIdField} = ?`,
      params: [userId],
    },
  };
}

// Builds the extra, additive WHERE fragment shared by the pending/declined/approved
// counts so they can be scoped by the same non-status filters as the sibling table.
// The grand totals above intentionally never use this - they stay global reference numbers.
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

  return {
    sql: clauses.length > 0 ? ` AND ${clauses.join(" AND ")}` : "",
    params,
  };
}

export const GET = requireAuth(async (request, { user }) => {
  const { role, id: userId } = user;
  try {
    const { searchParams } = new URL(request.url);
    const extraFilter = buildExtraFilterClause(searchParams);

    const roleConfig = ROLE_QUERY_CONFIGS[role];

    if (!roleConfig) {
      return Response.json({ message: "Invalid user role" }, { status: 403 });
    }

    let queryConfigs = {};

    //Determining query strategy based on role type
    if (role === "staff") {
      //staff role uses specific combined queries
      queryConfigs = {
        pending: roleConfig.getPendingQuery(userId),
        declined: roleConfig.getDeclinedQuery(userId),
        approved: roleConfig.getApprovedQuery(userId),
      };
    } else if (roleConfig.approvalField && roleConfig.approverIdField) {
      //Approvers use the generic approver query generator
      queryConfigs = getApproverQueryConfigs(
        role,
        roleConfig.approvalField,
        roleConfig.approverIdField,
        userId,
      );
    } else {
      //Fallback for unidentified configuration
      return Response.json(
        { message: "Role configuration error" },
        { status: 500 },
      );
    }

    // Append the shared extra filter clause to every status-scoped query.
    for (const key of ["pending", "declined", "approved"]) {
      queryConfigs[key] = {
        sql: queryConfigs[key].sql + extraFilter.sql,
        params: [...queryConfigs[key].params, ...extraFilter.params],
      };
    }

    //Execute queries
    const [
      pendingResult,
      declinedResult,
      approvedResult,
      totalResult,
      totalApprovedResult,
      totalDeclinedResult,
    ] = await withConnection(async (connection) => {
      // Prepare all six concurrent query promises
      const pendingPromise = connection.execute(
        queryConfigs.pending.sql,
        queryConfigs.pending.params,
      );
      const declinedPromise = connection.execute(
        queryConfigs.declined.sql,
        queryConfigs.declined.params,
      );
      const approvedPromise = connection.execute(
        queryConfigs.approved.sql,
        queryConfigs.approved.params,
      );
      const totalPromise = connection.execute(totalQuery);
      const totalApprovedPromise = connection.execute(totalApprovedQuery);
      const totalDeclinedPromise = connection.execute(totalDeclinedQuery);

      // Execute all six queries in parallel
      const [
        [pendingResult],
        [declinedResult],
        [approvedResult],
        [totalResult],
        [totalApprovedResult],
        [totalDeclinedResult],
      ] = await Promise.all([
        pendingPromise,
        declinedPromise,
        approvedPromise,
        totalPromise,
        totalApprovedPromise,
        totalDeclinedPromise,
      ]);

      return [
        pendingResult,
        declinedResult,
        approvedResult,
        totalResult,
        totalApprovedResult,
        totalDeclinedResult,
      ];
    });

    //Return the combined result
    return Response.json({
      pending: pendingResult[0].count,
      declined: declinedResult[0].count,
      approved: approvedResult[0].count,
      total: totalResult[0].count,
      totalApproved: totalApprovedResult[0].count,
      totalDeclined: totalDeclinedResult[0].count,
    });
  } catch (error) {
    console.error("Database Error: ", error);
    return Response.json(
      { message: "Failed to fetch Approval Counts" },
      { status: 500 },
    );
  }
});
