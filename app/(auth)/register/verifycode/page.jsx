import { redirect } from "next/navigation";
import pool from "@/lib/db";
import VerifyCodeComponent from "@/components/RegistrationComponents/VerifyCodeComponent";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

// Returns the email awaiting verification, or null if there isn't a valid,
// unexpired pending code for it.
async function getPendingEmail(cookie) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(cookie, secret);
    const email = payload.email;

    if (!email) return null;

    const [results] = await pool.execute(
      `SELECT * FROM verification_codes
         WHERE email = ? and verified = 0 and expires_at > NOW()`,
      [email],
    );

    return results.length > 0 ? email : null;
  } catch (error) {
    console.error("Verify code page error:", error);
    return null;
  }
}

export default async function Step2Page() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("verify_email")?.value;
  if (!cookie) redirect("/register");

  // redirect() works by throwing, so it must stay outside the try/catch above -
  // otherwise the catch logs every redirect as an "Error: NEXT_REDIRECT"
  const email = await getPendingEmail(cookie);
  if (!email) redirect("/register");

  return <VerifyCodeComponent email={email} />;
}
