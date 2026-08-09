// api/tablesdata/purchaseshistorydata/route.js
import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

//role to column mapping
const roleToColumnMap = {
  payroll: "Payroll_Approval",
  hr: "HR_Approval",
  cc: "CC_Approval",
  bi: "BI_Approval",
};

export const GET = requireAuth(async (request, { user }) => {
  const { role } = user;

  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize"), 10) || 10),
    );
    const offset = (page - 1) * pageSize;

    const biApproval = searchParams.get("biApproval") === "true";
    const searchQuery = searchParams.get("search") || "";
    const payrollNumber = searchParams.get("payrollNumber") || "";
    const referenceNumber = searchParams.get("referenceNumber") || "";
    const fromDate = searchParams.get("fromDate") || null;
    const toDate = searchParams.get("toDate") || null;

    //Approval Status Param and Payment Terms param
    const approvalStatus = searchParams.get("approvalStatus") || null;
    const paymentTerms = searchParams.get("paymentTerms") || null;

    //Credit period and request closure params
    const monthPeriod = searchParams.get("monthPeriod") || null;
    const requestClosure = searchParams.get("requestClosure") || null;

    const baseSelect = `SELECT id, createdAt, reference_number, staffName, payrollNo, employee_payment_terms, mpesa_code, user_credit_period, Payroll_Approval, HR_Approval, CC_Approval, BI_Approval,
         invoice_amount, request_closure
         FROM purchasesinfo`;

    let params = [];
    let whereClauses = [];

    // Every provided filter contributes its own clause; filters combine (AND) rather than being mutually exclusive.
    if (biApproval) {
      whereClauses.push(`BI_Approval = 'approved'`);
    }

    if (searchQuery) {
      whereClauses.push(`staffName LIKE ?`);
      params.push(`%${searchQuery}%`);
    }

    if (referenceNumber) {
      whereClauses.push(`reference_number = ?`);
      params.push(referenceNumber);
    }

    if (payrollNumber) {
      whereClauses.push(`payrollNo = ?`);
      params.push(payrollNumber);
    }

    if (fromDate && toDate) {
      whereClauses.push(`DATE(createdAt) BETWEEN ? AND ?`);
      params.push(fromDate, toDate);
    }

    if (approvalStatus) {
      const columnName = roleToColumnMap[role];
      if (columnName) {
        whereClauses.push(`${columnName} = ?`);
        params.push(approvalStatus);

        //Sequential logic - Only apply if looking for pending items
        if (approvalStatus === "pending") {
          if (role === "hr") {
            whereClauses.push(`Payroll_Approval = 'approved'`);
          } else if (role === "cc") {
            whereClauses.push(`HR_Approval = 'approved'`);
          } else if (role === "bi") {
            whereClauses.push(`CC_Approval = 'approved'`);
          }
        }
      }
    }

    if (paymentTerms) {
      whereClauses.push(`employee_payment_terms = ?`);
      params.push(paymentTerms);
    }

    if (monthPeriod) {
      whereClauses.push(`user_credit_period = ?`);
      params.push(Number(monthPeriod));
    }

    if (requestClosure) {
      whereClauses.push(`request_closure = ?`);
      params.push(requestClosure);
    }

    const whereSql =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    const dataQuery = `${baseSelect}${whereSql} ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    const countQuery = `SELECT COUNT(*) as count FROM purchasesinfo${whereSql}`;

    const { rows, total } = await withConnection(async (connection) => {
      const [rows] = await connection.execute(dataQuery, [
        ...params,
        pageSize,
        offset,
      ]);
      const [countResult] = await connection.execute(countQuery, params);
      return { rows, total: countResult[0].count };
    });

    return Response.json(
      {
        data: rows || [],
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { message: "Error Displaying the Data" },
      { status: 400 },
    );
  }
});
