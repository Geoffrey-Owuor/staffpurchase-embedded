"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ClientPortal from "../ClientPortal/ClientPortal";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Matches Tailwind's `md` breakpoint - below it modals use their mobile layout.
const DESKTOP_QUERY = "(min-width: 768px)";
const subscribeDesktop = (callback) => {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const useIsDesktop = () =>
  useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );

// Mobile layouts. Desktop is always a centered card; on mobile:
//  - "sheet": anchored to the bottom, slides up, capped at 90% height
//    (short dialogs/confirmations)
//  - "fullscreen": fills the viewport, slides up (content-heavy modals)
const MOBILE_LAYOUTS = {
  sheet: {
    backdrop: "items-end",
    panel: "w-full max-h-[90dvh] rounded-t-2xl",
  },
  fullscreen: {
    backdrop: "items-stretch",
    panel: "h-dvh w-full md:h-auto",
  },
};

const DESKTOP_MOTION = {
  initial: { scale: 0.95, opacity: 0, y: 20 },
  animate: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.95, opacity: 0, y: 20 },
  transition: { type: "spring", stiffness: 300, damping: 30 },
};
const MOBILE_MOTION = {
  initial: { y: "100%" },
  animate: { y: 0 },
  exit: { y: "100%" },
  transition: { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.3 },
};

// Open panels, oldest first - only the topmost one reacts to Escape/Tab, so a
// dialog opened from inside another modal (e.g. the password confirmation in
// Settings) behaves on its own.
const openPanels = [];
// Shared base for every modal/dialog: portal, one z-index layer (z-100 -
// above the sidebar/mobile drawer, below Alerts and the loading line; modals
// opened later stack above earlier ones by DOM order), enter/exit animation,
// Escape and backdrop-click to close, focus trap + restore, page scroll lock,
// and the mobile sheet/fullscreen layouts.
//
// Keep it mounted and toggle `open` so the exit animation can run - put any
// per-open state in a child component so it resets on reopen.
// `dismissible={false}` blocks Escape/backdrop/close while e.g. a request is
// in flight. Mark the element that should receive initial focus with
// `data-autofocus` (defaults to the first focusable element).
//
// `className` styles the panel (colors, border, padding) and must give it a
// desktop width (e.g. `md:max-w-md`; panels are w-full). Don't
// set width/height/rounding without an `md:` prefix - the mobile layout owns
// those below md.
export default function Modal({
  open,
  onClose,
  dismissible = true,
  labelledBy,
  mobile = "sheet",
  className = "",
  children,
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  const isDesktop = useIsDesktop();
  const layout = MOBILE_LAYOUTS[mobile] ?? MOBILE_LAYOUTS.sheet;
  const panelMotion = isDesktop ? DESKTOP_MOTION : MOBILE_MOTION;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement;

    openPanels.push(panel);
    document.documentElement.style.overflow = "hidden";
    (
      panel?.querySelector("[data-autofocus]") ||
      panel?.querySelector(FOCUSABLE) ||
      panel
    )?.focus({ preventScroll: true });

    const handleKeyDown = (e) => {
      if (!panel || openPanels[openPanels.length - 1] !== panel) return;

      if (e.key === "Escape" && dismissibleRef.current) {
        e.preventDefault();
        onCloseRef.current?.();
      } else if (e.key === "Tab") {
        const focusable = [...panel.querySelectorAll(FOCUSABLE)];
        if (focusable.length === 0) return e.preventDefault();
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      openPanels.splice(openPanels.indexOf(panel), 1);
      if (openPanels.length === 0) {
        document.documentElement.style.overflow = "";
      }
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return (
    <ClientPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            // Portaled clicks still bubble through the React tree - don't let
            // them reach e.g. a table row that opened this modal.
            onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget && dismissibleRef.current) {
                onCloseRef.current?.();
              }
            }}
            className={`fixed inset-0 z-100 flex justify-center bg-black/50 md:items-center md:p-4 dark:bg-black/60 ${layout.backdrop}`}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledBy}
              tabIndex={-1}
              {...panelMotion}
              className={`flex flex-col overflow-y-auto overscroll-contain focus:outline-none md:max-h-[calc(100dvh-2rem)] md:rounded-2xl ${layout.panel} ${className}`}
            >
              {children}
              {/* Keeps content clear of the iOS home indicator */}
              <div
                aria-hidden="true"
                className="h-[env(safe-area-inset-bottom)] shrink-0 md:hidden"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ClientPortal>
  );
}
