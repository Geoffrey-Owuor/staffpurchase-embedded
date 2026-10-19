"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useLoadingLineStore } from "@/store/useLoadingLineStore";

// Is this click an in-app navigation to a different page? Mirrors the cases
// next/link itself leaves to the browser (new tab, download, modifier keys).
const isInternalPageNavigation = (event) => {
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const anchor = event.target.closest?.("a[href]");
  if (!anchor || anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;

  const url = new URL(anchor.href, window.location.href);
  return (
    url.origin === window.location.origin &&
    url.pathname !== window.location.pathname
  );
};

// The one global route-change indicator, mounted once in the root layout.
// Starts on internal link clicks, browser back/forward (incl. router.back())
// and useDashboardRoutes().navigate; stops when the pathname changes. The
// store delays showing it by 150ms so fast navigations never flash.
const LoadingLine = () => {
  const isLoading = useLoadingLineStore((state) => state.isLoading);
  const startLoading = useLoadingLineStore((state) => state.startLoading);
  const stopLoading = useLoadingLineStore((state) => state.stopLoading);
  const pathname = usePathname();

  useEffect(() => {
    stopLoading();
  }, [pathname, stopLoading]);

  useEffect(() => {
    // Capture phase: row links call stopPropagation, which would hide the
    // click from a bubble-phase document listener.
    const handleClick = (event) => {
      if (isInternalPageNavigation(event)) startLoading();
    };
    const handlePopState = () => startLoading();

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [startLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loading-line"
          role="progressbar"
          aria-label="Loading page"
          className="fixed top-0 right-0 left-0 z-9999 h-[2.5px] origin-left bg-linear-to-r from-red-500 via-red-600 to-rose-700 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{
            scaleX: [0, 0.3, 0.6, 0.8, 0.95],
            transition: {
              duration: 2,
              times: [0, 0.3, 0.6, 0.8, 1],
              ease: "easeOut",
            },
          }}
          exit={{
            scaleX: 1,
            opacity: 0,
            transition: {
              scaleX: { duration: 0.2 },
              opacity: { duration: 0.2, delay: 0.15 },
            },
          }}
        >
          {/* Glowing effect */}
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-red-500 via-red-600 to-rose-700 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingLine;
