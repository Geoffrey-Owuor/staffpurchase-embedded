"use client";
import { useEffect } from "react";
import { useLoadingLineStore } from "@/store/useLoadingLineStore";
import { usePathname, useRouter } from "next/navigation";
import { useDashboardRoutes } from "@/utils/HandleActionClicks/useDashboardRoutes";
import { useUser } from "@/context/UserContext";
import LeftSidebar from "./LeftSidebar";
import TopSidebar from "./TopSidebar";
import { useSidebarStore } from "@/store/useSidebarStore";

export default function ReusableSidebar() {
  const showTopbar = useSidebarStore((state) => state.showTopbar);
  const { role } = useUser();
  const router = useRouter();

  const startLoading = useLoadingLineStore((state) => state.startLoading);
  const stopLoading = useLoadingLineStore((state) => state.stopLoading);

  const {
    homePath,
    historyPath,
    purchasePath,
    paymentTrackingPath,
    handleHomeRoute,
    handleHistoryRoute,
    handlePurchaseRoute,
  } = useDashboardRoutes();

  //Determining active tabs
  const pathname = usePathname();
  let activeTab = "";

  if (pathname === homePath) {
    activeTab = "home";
  } else if (pathname === historyPath) {
    activeTab = "history";
  } else if (pathname === purchasePath) {
    activeTab = "newpurchase";
  } else if (pathname === paymentTrackingPath) {
    activeTab = "paymentTracking";
  }

  const handleHomeClick = () => {
    if (pathname === homePath) return; //Do not start loading
    startLoading();
    handleHomeRoute();
  };

  const handleHistoryClick = () => {
    if (pathname === historyPath) return;
    startLoading();
    handleHistoryRoute();
  };

  const handlePurchaseClick = () => {
    if (pathname === purchasePath) return;
    startLoading();
    handlePurchaseRoute();
  };

  const handleNavClick = (path) => {
    if (pathname === path) return;
    startLoading();
    router.push(path);
  };

  // Hook for stopping loading line when pathname changes
  useEffect(() => {
    stopLoading();
  }, [pathname]);

  // Hook for managing the new purchase shortcut (Applys for all roles)
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for alt + N
      if (event.altKey && event.key === "n") {
        // Prevent browsers default new window action
        event.preventDefault();

        handlePurchaseClick();
      }
    };

    // Add an event listener when the component mounts
    document.addEventListener("keydown", handleKeyDown);

    // remove event listener when component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pathname, role]);

  return (
    <>
      {showTopbar ? (
        <TopSidebar
          role={role}
          router={router}
          handleHistoryClick={handleHistoryClick}
          handleHomeClick={handleHomeClick}
          handlePurchaseClick={handlePurchaseClick}
          handleNavClick={handleNavClick}
          activeTab={activeTab}
          paymentTrackingPath={paymentTrackingPath}
        />
      ) : (
        <LeftSidebar
          router={router}
          activeTab={activeTab}
          role={role}
          handleHomeClick={handleHomeClick}
          handlePurchaseClick={handlePurchaseClick}
          handleHistoryClick={handleHistoryClick}
          handleNavClick={handleNavClick}
          paymentTrackingPath={paymentTrackingPath}
        />
      )}
    </>
  );
}
