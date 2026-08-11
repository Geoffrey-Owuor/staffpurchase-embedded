import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { userEmailHandler } from "@/lib/Email/userEmailHandler";

const parseNumber = (value) => {
  return value === "" || value == null ? null : parseFloat(value);
};

class RouteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const POST = requireAuth(async (request, { user }) => {
  let referenceNumber = null;
  let staffInfo, products, paymentInfo;

  try {
    ({ staffInfo, products, paymentInfo } = await request.json());

    // Validate that all products have a tdPrice before beginning a transaction
    const missingPriceProducts = products.filter(
      (product) =>
        product.tdPrice === "" ||
        product.tdPrice === null ||
        product.tdPrice === undefined,
    );

    if (missingPriceProducts.length > 0) {
      return Response.json(
        {
          success: false,
          message:
            "Price is missing, click the search icon in product code field to insert the price",
        },
        { status: 400 },
      );
    }

    const purchaseId = await withTransaction(async (connection) => {
      // Destructure directly in the parameter list to avoid extra lines
      const [result] = await connection.execute(
        `INSERT INTO purchasesinfo
       (staffName, user_id, user_email, payrollNo, department, employee_payment_terms, mpesa_code, user_credit_period, invoicing_location, delivery_details, signature, Payroll_Approval, HR_Approval,
        CC_Approval, BI_Approval, request_closure)
       VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 'pending', 'pending', 'open')`,
        [
          staffInfo.staffName,
          user.id,
          user.email,
          staffInfo.payrollNo,
          staffInfo.department,
          paymentInfo.employee_payment_terms,
          paymentInfo.mpesa_code,
          parseNumber(paymentInfo.user_credit_period),
          paymentInfo.invoicing_location,
          paymentInfo.delivery_details,
          user.name,
        ],
      );

      //Get the resultant inserted id (Next auto_inceremented value)
      const insertedId = result.insertId;
      referenceNumber = `PRQ-${insertedId}`;

      //Run an update query to insert reference_number into purchasesinfo
      await connection.execute(
        `UPDATE purchasesinfo
       SET reference_number = ?
       WHERE increment_id = ?`,
        [referenceNumber, insertedId],
      );

      //Get the purchase (id) from purchasesinfo table
      const [rows] = await connection.execute(
        `SELECT id from purchasesinfo
       WHERE reference_number = ?`,
        [referenceNumber],
      );

      const purchaseId = rows[0]?.id;
      if (!purchaseId) {
        // Failsafe
        throw new RouteError(500, "Failed to retrieve final purchase ID.");
      }

      //Insert each product/item into the purchase_products table

      const itemInsertPromises = products.map((product) => {
        return connection.execute(
          `INSERT INTO purchase_products
        (purchase_id, itemName, itemStatus, productPolicy, productCode, tdPrice, discountRate, discountedValue)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchaseId,
            product.itemName,
            product.itemStatus,
            product.productPolicy,
            product.productCode,
            parseNumber(product.tdPrice),
            parseNumber(product.discountRate),
            parseNumber(product.discountedValue),
          ],
        );
      });

      await Promise.all(itemInsertPromises);

      //If payment terms is cash, autofill both payroll and hr data with default values
      if (paymentInfo.employee_payment_terms === "CASH") {
        await connection.execute(
          `
        UPDATE purchasesinfo
        SET
        payroll_approver_name = 'auto approval',
        payroll_approver_email = 'auto approval',
        payroll_signature = 'auto approval',
        payroll_approval_date = CURRENT_TIMESTAMP,
        Payroll_Approval = 'approved',
        one_third_rule = 'not applicable, cash payment'
        WHERE increment_id = ?
        `,
          [insertedId],
        );
      }

      return purchaseId;
    });

    // --- FIRE-AND-FORGET ---
    // Call the handler but DO NOT await it.
    // The code will continue immediately to the return statement.
    userEmailHandler({
      staffInfo,
      products,
      paymentInfo,
      user,
      referenceNumber,
    });

    return Response.json(
      {
        success: true,
        message: "Your purchase request has been submitted successfully",
        id: purchaseId,
      },
      { status: 201 }, // 201 Created for successful resource creation
    );
  } catch (error) {
    if (error instanceof RouteError) {
      return Response.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("Database error:", error);
    return Response.json(
      {
        success: false,
        message: "Error recording the purchase request",
        error: error.message,
      },
      { status: 500 },
    );
  }
});
