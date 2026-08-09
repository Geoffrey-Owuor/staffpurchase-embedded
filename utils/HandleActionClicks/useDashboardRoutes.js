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
  const historyPath = valid ? "/dashboard/history" : "/login";
  const purchasePath = valid ? "/dashboard/new-purchase" : "/login";
  const paymentTrackingPath = "/dashboard/payment-tracking";

  const getViewPathName = (id) =>
    valid ? `/dashboard/history/${id}` : "/login";
  const getEditPathName = (id) =>
    valid ? `/dashboard/history/${id}/edit` : "/login";

  return {
    homePath,
    historyPath,
    purchasePath,
    paymentTrackingPath,
    getViewPathName,
    getEditPathName,
    handleHomeRoute: () => router.push(homePath),
    handleHistoryRoute: () => router.push(historyPath),
    handlePurchaseRoute: () => router.push(purchasePath),
    handleViewClick: (id) => router.push(getViewPathName(id)),
    handleEditClick: (id) => router.push(getEditPathName(id)),
  };
}
