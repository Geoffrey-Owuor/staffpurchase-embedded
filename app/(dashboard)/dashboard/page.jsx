import { getCurrentUser } from "@/app/lib/auth";
import ApproverPurchasesTable from "@/components/DataTable/ApproverPurchasesTable";
import StaffPurchasesTable from "@/components/DataTable/StaffPurchasesTable";
import TermsConditions from "@/components/TermsConditions";

export default async function DashboardHomePage() {
  const user = await getCurrentUser();

  return (
    <>
      {user.role === "staff" ? (
        <StaffPurchasesTable />
      ) : (
        <ApproverPurchasesTable />
      )}
      <TermsConditions />
    </>
  );
}
