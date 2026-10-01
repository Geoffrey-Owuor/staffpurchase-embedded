"use client";
import ReusableSidebar from "../ReuseSideBar/ReusableSideBar";
import DashboardFooter from "../DashboardFooter";
import MobileHeader from "../Mobile/MobileHeader";
import UserContext from "@/context/UserContext";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useSidebarStore } from "@/store/useSidebarStore";
import ChangeLogAlert from "@/components/ChangeLog/ChangeLogAlert";
import { useEffect } from "react";

export default function ReusableLayoutShell({ user, children }) {
  const sidebarOpen = useSidebarStore((state) => state.sidebarOpen);
  const showTopbar = useSidebarStore((state) => state.showTopbar);

  useEffect(() => {
    // Broadcast the new login to other tabs
    const authChannel = new BroadcastChannel("auth_session_sync");
    authChannel.postMessage({ action: "LOGINEMBED", userId: user.id });
    authChannel.close();
  }, [user.id]);

  useAuthSync(user);

  const mainMarginClass = showTopbar
    ? "custom:left-2"
    : sidebarOpen
      ? "custom:left-58 custom:top-2"
      : "custom:left-14 custom:top-2";

  return (
    <UserContext.Provider value={user}>
      <ChangeLogAlert />
      <div className="min-h-screen">
        <MobileHeader />
        <ReusableSidebar />
        {/* The scroller itself must stay square: a border-radius on it makes
            Chrome recomposite a rounded clip mask on every scroll frame
            whenever it contains a nested scroller (the tables), which halved
            the frame rate on 4K screens. The rounded look comes from the
            corner "ears" painted on top instead (see .shell-ear). */}
        <div
          className={`fixed right-0 ${mainMarginClass} custom:right-2 custom:bottom-2 top-16 bottom-0 left-0 transition-all duration-200`}
        >
          <main className="bg-base-classes absolute inset-0 overflow-auto border border-gray-300 px-2 dark:border-gray-800">
            <div className="mx-auto mt-2 flex h-full max-w-7xl flex-col">
              <div className="flex-1">{children}</div>
              <DashboardFooter />
            </div>
          </main>
          <span aria-hidden="true" className="shell-ear shell-ear-tl" />
          <span aria-hidden="true" className="shell-ear shell-ear-tr" />
          <span
            aria-hidden="true"
            className="shell-ear shell-ear-bl custom:block hidden"
          />
          <span
            aria-hidden="true"
            className="shell-ear shell-ear-br custom:block hidden"
          />
        </div>
      </div>
    </UserContext.Provider>
  );
}
