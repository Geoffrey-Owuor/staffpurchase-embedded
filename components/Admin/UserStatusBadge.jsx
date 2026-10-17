import { isLockedOut } from "@/lib/loginPolicy";

// Account status for the admin pages: deactivated (is_active = 0, set by an
// admin) wins over locked (failed-login lockout) - see lib/loginPolicy.js.
export function getUserStatus(user) {
  if (!user.is_active) return "deactivated";
  if (isLockedOut(user.password_attempts)) return "locked";
  return "active";
}

const STATUS_STYLES = {
  active: { dot: "bg-green-500", label: "Active" },
  locked: { dot: "bg-yellow-500", label: "Locked" },
  deactivated: { dot: "bg-red-500", label: "Deactivated" },
};

// Same pill as TableApprovalStatus, for account status.
export default function UserStatusBadge({ user }) {
  const { dot, label } = STATUS_STYLES[getUserStatus(user)];

  return (
    <div className="inline-flex items-center gap-x-1 rounded-[9px] border border-gray-200 px-2 py-1 dark:border-gray-700">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </div>
  );
}
