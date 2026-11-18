import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/lib/permissions";
import UnauthorizedPage from "@/components/Reusables/UnauthorizedPage";

// Admins and anyone granted "analytics.view" (utils/permissions.js, managed
// at /dashboard/admin/access). Session validity is enforced by the parent
// /dashboard layout; /api/analytics checks the permission again on its own.
export default async function AnalyticsLayout({ children }) {
  const user = await getCurrentUser();

  if (!(await userHasPermission(user, "analytics.view"))) {
    return <UnauthorizedPage />;
  }

  return children;
}
