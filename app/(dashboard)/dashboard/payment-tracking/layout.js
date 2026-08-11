import { getCurrentUser } from "@/app/lib/auth";
import UnauthorizedPage from "@/components/Reusables/UnauthorizedPage";

// Payment Tracking is cc-only. Session/role validity is already enforced by
// the parent /dashboard layout - this only narrows further to the cc role.
export default async function PaymentTrackingLayout({ children }) {
  const user = await getCurrentUser();

  if (user.role !== "cc") {
    return <UnauthorizedPage />;
  }

  return children;
}
