import StaffOfferPromoPage from "@/components/Admin/StaffOffers/StaffOfferPromoPage";

export const metadata = {
  title: "HAL - Staff Offer Promo",
};

export default async function AdminStaffOfferPromoRoute({ params }) {
  const { id } = await params;
  return <StaffOfferPromoPage id={id} />;
}
