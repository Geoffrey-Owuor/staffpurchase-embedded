// A reusable createPortal function to solve server side document is not defined errors
"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

// false during SSR and hydration, true for anything mounted afterwards. Unlike
// a mounted-state effect this doesn't render null for a frame first, so an
// overlay replacing another one (dialog -> loader) never leaves a gap with no
// backdrop.
const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

const ClientPortal = ({ children, selector = "body" }) => {
  const isClient = useIsClient();

  if (!isClient) return null;

  // container uses "body" by default but a specific id can be passed if needed
  const container = document.querySelector(selector);

  return container ? createPortal(children, container) : null;
};

export default ClientPortal;
