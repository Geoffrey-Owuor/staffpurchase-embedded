import { createContext, useContext } from "react";
import { create } from "zustand";
import { NAV_LAYOUT_COOKIE, NAV_LAYOUT_MAX_AGE } from "@/utils/navLayout";

export const useSidebarStore = create((set) => ({
  // State
  sidebarOpen: true,
  // null until the user toggles in this tab - until then the layout comes
  // from the nav_layout cookie the server read (see useShowTopbar)
  showTopbar: null,

  // Setters
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
  // Also remembers the choice in a cookie, so the next full page load is
  // server-rendered in the same layout (no flash, no hydration mismatch -
  // unlike zustand's persist middleware, which only knows after hydration)
  setShowTopbar: (isShow) => {
    document.cookie = `${NAV_LAYOUT_COOKIE}=${
      isShow ? "topbar" : "sidebar"
    }; path=/; max-age=${NAV_LAYOUT_MAX_AGE}; samesite=lax`;
    set({ showTopbar: isShow });
  },
}));

// The layout the server rendered with (from the cookie), provided by
// ReusableLayoutShell.
export const InitialTopbarContext = createContext(false);

// Topbar or sidebar view: this tab's choice once made, otherwise the
// server's cookie value - identical on the server and the first client
// render.
export function useShowTopbar() {
  const showTopbar = useSidebarStore((state) => state.showTopbar);
  const initialShowTopbar = useContext(InitialTopbarContext);
  return showTopbar ?? initialShowTopbar;
}
