// app/api/register/staffdetails/route.js - Find the staff record for a
// company-email registration by the payroll number its owner typed, so the
// form can show the name (and department) the account will be created with.
// Only for an email whose code was just verified, and capped per code
// (verification_codes.staff_lookups) so it can't be used to scan staff
// numbers. Personal emails don't need it: their record is found by email
// when the Complete Registration page loads.
import { withConnection } from "@/lib/db";
import { parseEmail, INVALID_EMAIL_MESSAGE } from "@/lib/emailValidation";
import { isCompanyEmail } from "@/lib/staffDirectory";
import { resolveRegistrationStaff } from "@/lib/registrationStaff";
import { getVerifyEmailCookie } from "@/lib/verifyEmailCookie";

const MAX_LOOKUPS_PER_CODE = 5;

export async function POST(request) {
  try {
    const { email: rawEmail, payrollNo } = await request.json();
    const email = parseEmail(rawEmail);
    if (!email) {
      return Response.json({ message: INVALID_EMAIL_MESSAGE }, { status: 400 });
    }
    if (!isCompanyEmail(email)) {
      return Response.json({ message: "Not available" }, { status: 400 });
    }
    if ((await getVerifyEmailCookie()) !== email) {
      return Response.json(
        { message: "Your code has expired. Please register again." },
        { status: 400 },
      );
    }
    if (typeof payrollNo !== "string" || payrollNo.trim().length > 150) {
      return Response.json(
        { message: "Enter your payroll number" },
        { status: 400 },
      );
    }

    const result = await withConnection(async (conn) => {
      const [counted] = await conn.execute(
        `UPDATE verification_codes SET staff_lookups = staff_lookups + 1
         WHERE email = ? AND verified = 1 AND expires_at > NOW()
         AND staff_lookups < ?`,
        [email, MAX_LOOKUPS_PER_CODE],
      );
      if (counted.affectedRows === 0) {
        return {
          status: 429,
          message:
            "Too many attempts, or your code has expired. Please register again.",
        };
      }
      return resolveRegistrationStaff(conn, email, payrollNo);
    });

    if (result.status) {
      return Response.json(
        { message: result.message },
        { status: result.status },
      );
    }
    return Response.json({ staff: result.staff });
  } catch (error) {
    console.error("Staff details lookup error:", error);
    return Response.json(
      { message: "Couldn't look up your staff record" },
      { status: 500 },
    );
  }
}
