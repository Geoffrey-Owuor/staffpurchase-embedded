import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import UnauthorizedPage from "@/components/Reusables/UnauthorizedPage";
import ReusableLayoutShell from "@/components/Reusables/ReuseLayoutShell/ReusableLayoutShell";
import { isValidRole } from "@/utils/routes";
import { isSessionCurrent } from "@/lib/sessionCheck";

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

  return <ReusableLayoutShell user={user}>{children}</ReusableLayoutShell>;
}
