"use client";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  ClipboardPen,
  Database,
  Megaphone,
  ScrollText,
  ShieldUser,
  Tags,
  UsersRound,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { isValidRole } from "@/utils/routes";
import { useLoadingLineStore } from "@/store/useLoadingLineStore";

// Every navigable entry, with groups replaced by their pages
export const flattenNavItems = (items) =>
  items.flatMap((item) => item.children ?? [item]);

// Whether `key` is this entry or one of its group's pages
export const navItemContains = (item, key) =>
  item.key === key || !!item.children?.some((child) => child.key === key);

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
  const adminUsersPath = "/dashboard/admin/users";
  const adminAuditLogPath = "/dashboard/admin/audit-log";
  const adminRequestsPath = "/dashboard/admin/requests";
  const adminAnalyticsPath = "/dashboard/admin/analytics";
  const adminReferenceDataPath = "/dashboard/admin/reference-data";
  const adminBannersPath = "/dashboard/admin/banners";
  const adminStaffOffersPath = "/dashboard/admin/staff-offers";
  const getAdminPromoPath = (id) => `${adminStaffOffersPath}/${id}`;
  const getAdminEditPathName = (id) => `${adminRequestsPath}/${id}`;

  const getViewPathName = (id) => (valid ? `/dashboard/${id}` : "/login");
  const getEditPathName = (id) => (valid ? `/dashboard/${id}/edit` : "/login");

  // Nav entries beyond Home/New Purchase, per role - the sidebar, topbar and
  // mobile drawer all render this one list. Each page is still gated by its
  // own layout.js; this only decides what's shown. An entry with `children`
  // is a group (no path of its own): a dropdown in the topbar, a collapsible
  // section in the sidebar/drawer and a flyout in the collapsed sidebar.
  const roleNavItems = [
    ...(role === "cc"
      ? [
          {
            key: "paymentTracking",
            path: paymentTrackingPath,
            label: "Fully Approved",
            Icon: BookOpenCheck,
          },
        ]
      : []),
    ...(role === "admin"
      ? [
          {
            key: "admin",
            label: "Admin",
            Icon: ShieldUser,
            children: [
              {
                key: "adminAnalytics",
                path: adminAnalyticsPath,
                label: "Analytics",
                Icon: BarChart3,
              },
              {
                key: "adminUsers",
                path: adminUsersPath,
                label: "Users",
                Icon: UsersRound,
              },
              {
                key: "adminRequests",
                path: adminRequestsPath,
                label: "All Requests",
                Icon: ClipboardPen,
              },
              {
                key: "adminReferenceData",
                path: adminReferenceDataPath,
                label: "Reference Data",
                Icon: Database,
              },
              {
                key: "adminStaffOffers",
                path: adminStaffOffersPath,
                label: "Staff Offers",
                Icon: Tags,
              },
              {
                key: "adminBanners",
                path: adminBannersPath,
                label: "Banners",
                Icon: Megaphone,
              },
              {
                key: "adminAuditLog",
                path: adminAuditLogPath,
                label: "Audit Log",
                Icon: ScrollText,
              },
            ],
          },
        ]
      : []),
  ];

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
    adminUsersPath,
    adminAuditLogPath,
    adminRequestsPath,
    getAdminEditPathName,
    adminStaffOffersPath,
    getAdminPromoPath,
    roleNavItems,
    getViewPathName,
    getEditPathName,
    navigate,
    handleHomeRoute: () => navigate(homePath),
    handlePurchaseRoute: () => navigate(purchasePath),
    handleViewClick: (id) => navigate(getViewPathName(id)),
    handleEditClick: (id) => navigate(getEditPathName(id)),
  };
}
