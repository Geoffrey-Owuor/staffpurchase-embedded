import { redirect } from "next/navigation";

// Analytics is the admin landing view.
export default function AdminIndexPage() {
  redirect("/dashboard/admin/analytics");
}
