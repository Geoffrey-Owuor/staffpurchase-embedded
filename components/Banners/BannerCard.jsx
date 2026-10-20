import { Info, TriangleAlert, OctagonAlert, X } from "lucide-react";

export const severityStyles = {
  info: {
    Icon: Info,
    classes:
      "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-100",
  },
  warning: {
    Icon: TriangleAlert,
    classes:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-100",
  },
  critical: {
    Icon: OctagonAlert,
    classes:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/60 dark:text-red-100",
  },
};

// One dashboard banner, as users see it. Shared by SystemBanners and the
// admin banner preview so the two never drift apart. `onDismiss` adds the
// close button (info/warning only - the caller decides).
export default function BannerCard({ severity, message, onDismiss }) {
  const { Icon, classes } = severityStyles[severity] || severityStyles.info;

  return (
    <div
      role={severity === "critical" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${classes}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 break-words whitespace-pre-line">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 transition-opacity hover:opacity-70"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
