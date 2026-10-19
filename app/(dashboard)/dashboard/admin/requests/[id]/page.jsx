import AdminEditPurchase from "@/components/Admin/AdminEditPurchase";

export const metadata = {
  title: "HAL - Admin Edit Request",
};

export default async function AdminEditRequestPage({ params }) {
  const { id } = await params;
  return <AdminEditPurchase id={id} />;
}
