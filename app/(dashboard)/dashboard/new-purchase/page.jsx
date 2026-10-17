import { getCurrentUser } from "@/app/lib/auth";
import NewPurchase from "@/components/staff/NewPurchase";
import TermsConditions from "@/components/TermsConditions";
import { isRequesterRole } from "@/utils/routes";

export default async function NewPurchasePage() {
  const user = await getCurrentUser();

  return (
    <>
      <NewPurchase approversPurchasing={!isRequesterRole(user.role)} />
      <TermsConditions />
    </>
  );
}
