import { getCurrentUser } from "@/app/lib/auth";
import UnauthorizedPage from "@/components/Reusables/UnauthorizedPage";

// The admin tools are admin-only. Session validity (including the
// session_version/is_active re-check) is already enforced by the parent
// /dashboard layout - this only narrows further to the admin role. Every
// /api/admin route checks the role again on its own.
export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  if (user.role !== "admin") {
    return <UnauthorizedPage />;
  }

  return children;
}
