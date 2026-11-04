"use client";

import { X, BadgeCheck, AlertOctagon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAlertStore } from "@/store/useAlertStore";

const AUTO_CLOSE_MS = 6000;
const EXIT_MS = 200; // Matches .animate-toast-out

const THEMES = {
  success: {
    title: "Success",
    Icon: BadgeCheck,
    accentBar: "bg-green-500",
    iconColor: "text-green-400 dark:text-green-600",
    iconBg: "bg-green-500/20 dark:bg-green-100",
  },
  error: {
    title: "Error",
    Icon: AlertOctagon,
    accentBar: "bg-red-500",
    iconColor: "text-red-400 dark:text-red-600",
    iconBg: "bg-red-500/20 dark:bg-red-100",
  },
};

const Alert = ({ alert }) => {
  const dismissAlert = useAlertStore((state) => state.dismissAlert);
  const { id, type, message, count } = alert;
  const [isClosing, setIsClosing] = useState(false);
  const theme = THEMES[type] ?? THEMES.error;
  const { Icon } = theme;

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => dismissAlert(id), EXIT_MS);
  }, [dismissAlert, id]);

  useEffect(() => {
    const timer = setTimeout(handleClose, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [handleClose]);

  return (
    // Positioned by AlertLayer
    <div
      role={type === "error" ? "alert" : "status"}
      className={`pointer-events-auto ${
        isClosing ? "animate-toast-out" : "animate-toast-in"
      }`}
    >
      {/* Inverted against the page: black in light mode, white in dark mode */}
      <div className="relative flex items-start gap-3 overflow-hidden rounded-2xl bg-black p-4 shadow-lg dark:bg-white">
        <div
          className={`absolute top-0 bottom-0 left-0 w-1.5 ${theme.accentBar}`}
        />

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${theme.iconColor}`} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col pt-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-white dark:text-gray-900">
              {theme.title}
            </h3>
            {count > 1 && (
              <span
                aria-label={`Shown ${count} times`}
                className="rounded-full bg-white/15 px-1.5 py-px text-[11px] leading-4 font-semibold text-white tabular-nums dark:bg-gray-900/10 dark:text-gray-900"
              >
                x{count}
              </span>
            )}
          </div>
          {/* Server messages can be long, and the user needs to read them */}
          <p
            className="mt-0.5 line-clamp-4 text-[13px] wrap-break-word text-gray-200 dark:text-gray-700"
            title={message}
          >
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 cursor-pointer rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white active:scale-95 dark:text-gray-500 dark:hover:bg-gray-200 dark:hover:text-gray-900"
          aria-label="Close alert"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default Alert;
