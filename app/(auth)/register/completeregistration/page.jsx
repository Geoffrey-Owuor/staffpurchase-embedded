import { redirect } from "next/navigation";
import pool, { withConnection } from "@/lib/db";
import CompleteRegistrationComponent from "@/components/RegistrationComponents/CompleteRegistrationComponent";
import { isCompanyEmail } from "@/lib/staffDirectory";
import { resolveRegistrationStaff } from "@/lib/registrationStaff";
import { getVerifyEmailCookie } from "@/lib/verifyEmailCookie";

// Returns the cookie's email if its code has been verified, or null.
async function getVerifiedEmail() {
  try {
    const email = await getVerifyEmailCookie();
    if (!email) return null;

    const [results] = await pool.execute(
      `SELECT * FROM verification_codes 
     WHERE email = ? AND verified = 1 AND expires_at > NOW()`,
      [email],
    );

    return results.length > 0 ? email : null;
  } catch (error) {
    console.error("Complete registration page error:", error);
    return null;
  }
}

export default async function Step3Page() {
  // redirect() throws, so keep it outside the try/catch above
  const email = await getVerifiedEmail();
  if (!email) redirect("/register");

  // A personal email was only sent a code because it's on a staff record,
  // so that record's details are known now (and shown read-only). A company
  // email's owner finds theirs by payroll number on the form.
  const company = isCompanyEmail(email);
  let staff = null;
  let staffError = null;
  if (!company) {
    try {
      const result = await withConnection((conn) =>
        resolveRegistrationStaff(conn, email),
      );
      if (result.status) staffError = result.message;
      else staff = result.staff;
    } catch (error) {
      console.error("Complete registration staff lookup error:", error);
      staffError = "Couldn't load your staff record. Please try again.";
    }
  }

  return (
    <CompleteRegistrationComponent
      email={email}
      isCompanyEmail={company}
      initialStaff={staff}
      staffError={staffError}
    />
  );
}
