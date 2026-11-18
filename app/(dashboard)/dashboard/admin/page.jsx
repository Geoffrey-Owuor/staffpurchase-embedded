import { redirect } from "next/navigation";

// Users is the admin landing view (Analytics moved to /dashboard/analytics).
export default function AdminIndexPage() {
  redirect("/dashboard/admin/users");
}
