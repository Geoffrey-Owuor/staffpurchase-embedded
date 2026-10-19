// Topbar vs sidebar view preference, kept in a plain (non-httpOnly) cookie
// so the server can render the right layout on the first paint and the
// client can update it when the user toggles (store/useSidebarStore.js).
export const NAV_LAYOUT_COOKIE = "nav_layout";
export const NAV_LAYOUT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const isTopbarLayout = (cookieValue) => cookieValue === "topbar";
