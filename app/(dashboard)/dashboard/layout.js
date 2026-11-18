import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/app/lib/auth";
import UnauthorizedPage from "@/components/Reusables/UnauthorizedPage";
import ReusableLayoutShell from "@/components/Reusables/ReuseLayoutShell/ReusableLayoutShell";
import { isValidRole } from "@/utils/routes";
import { isSessionCurrent } from "@/lib/sessionCheck";
import { getUserPermissions } from "@/lib/permissions";
import { NAV_LAYOUT_COOKIE, isTopbarLayout } from "@/utils/navLayout";

export const metadata = {
  title: "HAL - Dashboard",
  description: "Hotpoint Staff Product Purchase Dashboard",
};

export default async function layout({ children }) {
  const user = await getCurrentUser();

  if (!user?.valid) {
    return redirect("/login");
  }

  // Deactivated / role changed / password reset since this JWT was issued
  if (!(await isSessionCurrent(user))) {
    return redirect("/api/session-ended");
  }

  if (!isValidRole(user.role)) {
    return <UnauthorizedPage />;
  }

  // Topbar/sidebar preference, so the first render already matches it
  const initialShowTopbar = isTopbarLayout(
    (await cookies()).get(NAV_LAYOUT_COOKIE)?.value,
  );

  // Extra access areas (utils/permissions.js) - only decides what the nav
  // shows; each page and API checks the DB again. useAuthSync refreshes this
  // layout when they change.
  const permissions = await getUserPermissions(user);

  return (
    <ReusableLayoutShell
      user={{ ...user, permissions }}
      initialShowTopbar={initialShowTopbar}
    >
      {children}
    </ReusableLayoutShell>
  );
}
