"use client";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ClientPortal from "../ClientPortal/ClientPortal";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open panels, oldest first - only the topmost one reacts to Escape/Tab, so a
// dialog opened from inside another modal (e.g. the password confirmation in
// Settings) behaves on its own.
const openPanels = [];

// Shared base for every modal/dialog: portal, one z-index layer (z-100 -
// above the sidebar/mobile drawer, below Alerts and the loading line; modals
// opened later stack above earlier ones by DOM order), enter/exit animation,
// Escape and backdrop-click to close, focus trap + restore, page scroll lock.
//
// Keep it mounted and toggle `open` so the exit animation can run.
// `dismissible={false}` blocks Escape/backdrop/close while e.g. a request is
// in flight. Mark the element that should receive initial focus with
// `data-autofocus` (defaults to the first focusable element).
export default function Modal({
  open,
  onClose,
  dismissible = true,
  labelledBy,
  className = "",
  children,
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

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
    )?.focus();

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
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 dark:bg-black/60"
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledBy}
              tabIndex={-1}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`focus:outline-none ${className}`}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ClientPortal>
  );
}
