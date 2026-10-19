import { getCurrentUser } from "@/app/lib/auth";
import ApproverPurchasesTable from "@/components/DataTable/ApproverPurchasesTable";
import StaffPurchasesTable from "@/components/DataTable/StaffPurchasesTable";
import TermsConditions from "@/components/TermsConditions";
import { isRequesterRole } from "@/utils/routes";

export default async function DashboardHomePage() {
  const user = await getCurrentUser();

  return (
    <>
      {isRequesterRole(user.role) ? (
        <StaffPurchasesTable />
      ) : (
        <ApproverPurchasesTable />
      )}
      <TermsConditions />
    </>
  );
}
