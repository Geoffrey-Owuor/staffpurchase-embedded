import { getCurrentUser } from "@/app/lib/auth";
import NewPurchase from "@/components/staff/NewPurchase";
import TermsConditions from "@/components/TermsConditions";

export default async function NewPurchasePage() {
  const user = await getCurrentUser();

  return (
    <>
      <NewPurchase approversPurchasing={user.role !== "staff"} />
      <TermsConditions />
    </>
  );
}
