import { withConnection } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

export const GET = requireAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize"), 10) || 10),
    );
    const offset = (page - 1) * pageSize;

    const searchQuery = searchParams.get("search") || "";
    const payrollNumber = searchParams.get("payrollNumber") || "";
    const referenceNumber = searchParams.get("referenceNumber") || "";
    const fromDate = searchParams.get("fromDate") || null;
    const toDate = searchParams.get("toDate") || null;

    //Approval Status Param and Payment Terms param
    const approvalStatus = searchParams.get("approvalStatus") || null;
    const paymentTerms = searchParams.get("paymentTerms") || null;

    const baseSelect = `SELECT id, createdAt, reference_number, employee_payment_terms, mpesa_code, user_credit_period, staffName, payrollNo, invoicing_location, Payroll_Approval, HR_Approval, CC_Approval, BI_Approval
                 FROM purchasesinfo`;

    let params = [];
    let whereClauses = [];

    //Staff only ever see their own requests - session-derived, never client-supplied.
    whereClauses.push(`user_id = ?`);
    params.push(user.id);

    // Every provided filter contributes its own clause; filters combine (AND) rather than being mutually exclusive.
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

    if (paymentTerms) {
      whereClauses.push(`employee_payment_terms = ?`);
      params.push(paymentTerms);
    }

    if (approvalStatus) {
      if (approvalStatus === "declined") {
        whereClauses.push(`
      (Payroll_Approval = ? OR BI_Approval = ? OR HR_Approval = ? OR CC_Approval = ?)
    `);
        params.push("declined", "declined", "declined", "declined");
      } else {
        whereClauses.push(`
      BI_Approval = ? AND
      CC_Approval <> 'declined' AND
      HR_Approval <> 'declined' AND
      Payroll_Approval <> 'declined'
    `);
        params.push(approvalStatus);
      }
    }

    const whereSql =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    // pageSize/offset are clamped integers computed above (never raw user
    // strings), so inlining them is safe. mysql2's execute() (server-side
    // prepared statements) can throw `ER_WRONG_ARGUMENTS: Incorrect
    // arguments to mysqld_stmt_execute` when LIMIT/OFFSET are bound as `?`
    // placeholders - inlining sidesteps that incompatibility entirely.
    const dataQuery = `${baseSelect}${whereSql} ORDER BY createdAt DESC LIMIT ${pageSize} OFFSET ${offset}`;
    const countQuery = `SELECT COUNT(*) as count FROM purchasesinfo${whereSql}`;

    const { rows, total } = await withConnection(async (connection) => {
      const [rows] = await connection.execute(dataQuery, params);
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
