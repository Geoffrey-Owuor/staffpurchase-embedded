"use client";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { isValidRole } from "@/utils/routes";
import { useLoadingLineStore } from "@/store/useLoadingLineStore";

// Replaces the old per-role UseHandleHomeRoute/UseHandlePurchaseRoute/
// UseHandleHistoryRoute/UseHandleViewClick/UseHandleEditClick hooks. Every
// role now shares the same /dashboard route tree, so there's nothing left to
// branch on - this hook just builds the shared paths and falls back to
// /login for a session with no recognized role.
export function useDashboardRoutes() {
  const { role } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const startLoading = useLoadingLineStore((state) => state.startLoading);
  const valid = isValidRole(role);

  const homePath = valid ? "/dashboard" : "/login";
  const purchasePath = valid ? "/dashboard/new-purchase" : "/login";
  const paymentTrackingPath = "/dashboard/payment-tracking";

  const getViewPathName = (id) => (valid ? `/dashboard/${id}` : "/login");
  const getEditPathName = (id) =>
    valid ? `/dashboard/${id}/edit` : "/login";

  // Programmatic navigation that drives the global loading line (link clicks
  // and back/forward are picked up by LoadingLine itself). A no-op for the
  // current page.
  const navigate = (path) => {
    if (path === pathname) return;
    startLoading();
    router.push(path);
  };

  return {
    homePath,
    purchasePath,
    paymentTrackingPath,
    getViewPathName,
    getEditPathName,
    navigate,
    handleHomeRoute: () => navigate(homePath),
    handlePurchaseRoute: () => navigate(purchasePath),
    handleViewClick: (id) => navigate(getViewPathName(id)),
    handleEditClick: (id) => navigate(getEditPathName(id)),
  };
}
