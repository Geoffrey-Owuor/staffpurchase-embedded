"use client";

import { useSyncExternalStore } from "react";
import { useStickyBleed } from "@/hooks/useStickyBleed";

// Tablet and up: on a phone these bars wrap to 2-3 rows, which would take too
// much of the screen. The height limit only rules out phones held sideways; a
// laptop at 150% display scaling has about 600px, and pins.
const PIN_QUERY = "(min-width: 768px) and (min-height: 500px)";
const subscribe = (callback) => {
  const mql = window.matchMedia(PIN_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const useCanPin = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PIN_QUERY).matches,
    () => false,
  );

// A page's title bar: pins to the top of <main> when scrolling, where it becomes
// a toolbar whose bottom border spans the scroller like the table FilterPanel's.
// Negative margins stretch it and matching padding keeps the contents still, and
// the border is always there (transparent until stuck), so nothing shifts.
// `className` styles the inner row. Keep it short: long descriptions belong below.
// Not for pages with a FilterPanel, which already pins, or two bars would stack.
export default function StickyPageHeader({ className = "", children }) {
  const { sentinelRef, isStuck, bleed } = useStickyBleed();
  const canPin = useCanPin();
  const stuck = canPin && isStuck;

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-0" />
      <div
        style={
          stuck
            ? {
                marginLeft: -bleed.left,
                marginRight: -bleed.right,
                paddingLeft: bleed.left,
                paddingRight: bleed.right,
              }
            : undefined
        }
        className={`z-20 border-b bg-white dark:bg-gray-950 ${
          canPin ? "sticky top-0" : ""
        } ${
          stuck ? "border-gray-200 dark:border-gray-800" : "border-transparent"
        }`}
      >
        <div className={className}>{children}</div>
      </div>
    </>
  );
}
