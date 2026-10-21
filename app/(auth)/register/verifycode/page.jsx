import { redirect } from "next/navigation";
import VerifyCodeComponent from "@/components/RegistrationComponents/VerifyCodeComponent";
import { isCompanyEmail } from "@/lib/staffDirectory";
import { getVerifyEmailCookie } from "@/lib/verifyEmailCookie";

export default async function Step2Page() {
  // The (5-minute) cookie is enough: a personal email that isn't on the
  // staff directory gets the cookie but no code, and this page must look the
  // same for it, so whether a code row exists isn't checked here (the
  // verifycode API checks the code itself).
  const email = await getVerifyEmailCookie();
  if (!email) redirect("/register");

  return (
    <VerifyCodeComponent email={email} isCompanyEmail={isCompanyEmail(email)} />
  );
}
