import { redirect } from "next/navigation";
import pool from "@/lib/db";
import CompleteRegistrationComponent from "@/components/RegistrationComponents/CompleteRegistrationComponent";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

// Returns the verified email ready to complete registration, or null.
async function getVerifiedEmail(cookie) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(cookie, secret);
    const email = payload.email;

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
  const cookieStore = await cookies();
  const cookie = cookieStore.get("verify_email")?.value;
  if (!cookie) redirect("/register");

  // redirect() throws, so keep it outside the try/catch above
  const email = await getVerifiedEmail(cookie);
  if (!email) redirect("/register");

  return <CompleteRegistrationComponent email={email} />;
}
