import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import UnauthorizedPage from "@/components/Reusables/UnauthorizedPage";
import ReusableLayoutShell from "@/components/Reusables/ReuseLayoutShell/ReusableLayoutShell";
import { isValidRole } from "@/utils/routes";

export const metadata = {
  title: "HAL - Dashboard",
  description: "Hotpoint Staff Product Purchase Dashboard",
};

export default async function layout({ children }) {
  const user = await getCurrentUser();

  if (!user?.valid) {
    return redirect("/login");
  }

  if (!isValidRole(user.role)) {
    return <UnauthorizedPage />;
  }

  return <ReusableLayoutShell user={user}>{children}</ReusableLayoutShell>;
}
