"use client";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { isValidRole } from "@/utils/routes";

// Replaces the old per-role UseHandleHomeRoute/UseHandlePurchaseRoute/
// UseHandleHistoryRoute/UseHandleViewClick/UseHandleEditClick hooks. Every
// role now shares the same /dashboard route tree, so there's nothing left to
// branch on - this hook just builds the shared paths and falls back to
// /login for a session with no recognized role.
export function useDashboardRoutes() {
  const { role } = useUser();
  const router = useRouter();
  const valid = isValidRole(role);

  const homePath = valid ? "/dashboard" : "/login";
  const purchasePath = valid ? "/dashboard/new-purchase" : "/login";
  const paymentTrackingPath = "/dashboard/payment-tracking";

  const getViewPathName = (id) => (valid ? `/dashboard/${id}` : "/login");
  const getEditPathName = (id) =>
    valid ? `/dashboard/${id}/edit` : "/login";

  return {
    homePath,
    purchasePath,
    paymentTrackingPath,
    getViewPathName,
    getEditPathName,
    handleHomeRoute: () => router.push(homePath),
    handlePurchaseRoute: () => router.push(purchasePath),
    handleViewClick: (id) => router.push(getViewPathName(id)),
    handleEditClick: (id) => router.push(getEditPathName(id)),
  };
}
