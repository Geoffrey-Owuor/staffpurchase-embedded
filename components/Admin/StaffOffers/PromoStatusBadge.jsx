const STATUS_STYLES = {
  live: { dot: "bg-green-500", label: "Live" },
  scheduled: { dot: "bg-blue-500", label: "Scheduled" },
  ended: { dot: "bg-gray-400", label: "Ended" },
  inactive: { dot: "bg-red-500", label: "Inactive" },
  active: { dot: "bg-green-500", label: "Active" },
};

// Same pill as UserStatusBadge - a promo's status (lib/adminStaffOffers.js
// PROMO_STATUS_SQL) or a product row's active/inactive.
export default function PromoStatusBadge({ status }) {
  const { dot, label } = STATUS_STYLES[status] ?? STATUS_STYLES.inactive;

  return (
    <div className="inline-flex items-center gap-x-1 rounded-[9px] border border-gray-200 px-2 py-1 dark:border-gray-700">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </div>
  );
}
