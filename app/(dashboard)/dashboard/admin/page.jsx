import { redirect } from "next/navigation";

// No admin landing page yet - Users is the main admin view.
export default function AdminIndexPage() {
  redirect("/dashboard/admin/users");
}
