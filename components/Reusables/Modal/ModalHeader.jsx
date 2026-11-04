"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getScrollParent } from "@/hooks/useStickyBleed";

// Literal class names so Tailwind sees them. Keyed by the padding the Modal panel
// sets (`p-4`/`p-5`/`p-6`): the bar cancels it to reach the panel's edges. That
// includes the sticky offset, which browsers measure from inside the padding.
const BLEED = {
  4: { sentinel: "-mt-4", bar: "-top-4 -mx-4 px-4" },
  5: { sentinel: "-mt-5", bar: "-top-5 -mx-5 px-5" },
  6: { sentinel: "-mt-6", bar: "-top-6 -mx-6 px-6" },
};

// A Modal's title bar, the first thing in the panel: title, optional one-line
// subtitle and close button, pinned while the panel scrolls. The border shows only
// once something is underneath it. Longer descriptions and badges belong in the
// body, below this, so the bar stays small on short screens.
//
// Uses CSS margins rather than useStickyBleed's measuring: a panel's padding is
// known, and measuring would run during its opening scale animation.
export default function ModalHeader({
  titleId,
  title,
  subtitle,
  onClose,
  closeDisabled = false,
  padding = 6,
}) {
  const sentinelRef = useRef(null);
  const [isStuck, setIsStuck] = useState(false);
  const bleed = BLEED[padding] ?? BLEED[6];

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = getScrollParent(sentinel);
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { root, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* At the very top of the scrollport, so it leaves on the first scrolled pixel */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className={`-mb-px h-px shrink-0 ${bleed.sentinel}`}
      />
      <div
        data-modal-header
        className={`sticky z-20 flex shrink-0 items-start justify-between gap-4 border-b bg-gray-50 pt-4 pb-3 dark:bg-gray-950 ${bleed.bar} ${
          isStuck
            ? "border-gray-200 dark:border-gray-800"
            : "border-transparent"
        }`}
      >
        <div className="min-w-0">
          <h3
            id={titleId}
            className="line-clamp-2 text-xl font-bold text-gray-900 dark:text-white"
          >
            {title}
          </h3>
          {subtitle && (
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Close"
          className="-m-1 shrink-0 cursor-pointer rounded-full p-1 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
