import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/app/lib/auth";
import UnauthorizedPage from "@/components/Reusables/UnauthorizedPage";
import ReusableLayoutShell from "@/components/Reusables/ReuseLayoutShell/ReusableLayoutShell";
import { isValidRole } from "@/utils/routes";
import { isSessionCurrent } from "@/lib/sessionCheck";
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

  return (
    <ReusableLayoutShell user={user} initialShowTopbar={initialShowTopbar}>
      {children}
    </ReusableLayoutShell>
  );
}
