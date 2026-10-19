import { create } from "zustand";

// Navigations that settle within this window never show the line, so fast
// (prefetched/cached) route changes don't flicker.
const SHOW_DELAY_MS = 150;

// Fail-safe: never leave the line running if a navigation is abandoned
// without the pathname ever changing.
const MAX_DURATION_MS = 15000;

let showTimer = null;
let failSafeTimer = null;

const clearTimers = () => {
  clearTimeout(showTimer);
  clearTimeout(failSafeTimer);
  showTimer = null;
  failSafeTimer = null;
};

// Driven only by components/Reusables/LoadingLine.jsx (link clicks, popstate,
// pathname changes) and useDashboardRoutes().navigate - components shouldn't
// call these directly.
export const useLoadingLineStore = create((set, get) => ({
  isLoading: false,

  startLoading: () => {
    if (showTimer || get().isLoading) return;
    showTimer = setTimeout(() => {
      showTimer = null;
      set({ isLoading: true });
    }, SHOW_DELAY_MS);
    failSafeTimer = setTimeout(() => get().stopLoading(), MAX_DURATION_MS);
  },

  stopLoading: () => {
    clearTimers();
    if (get().isLoading) set({ isLoading: false });
  },
}));
