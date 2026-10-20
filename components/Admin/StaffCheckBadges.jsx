// The staff directory checks for an account (see STAFF_CHECK_OPTIONS):
// whether its payroll number has been confirmed as an active staff record,
// and whether another account shares it. Same pill as UserStatusBadge.
function Pill({ dot, label, title }) {
  return (
    <div
      title={title}
      className="inline-flex items-center gap-x-1 rounded-[9px] border border-gray-200 px-2 py-1 whitespace-nowrap dark:border-gray-700"
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </div>
  );
}

export default function StaffCheckBadges({ user }) {
  return (
    <div className="flex flex-wrap gap-1">
      {user.staffVerified ? (
        <Pill
          dot="bg-green-500"
          label="Verified"
          title="Payroll number matches an active HR staff record"
        />
      ) : (
        <Pill
          dot="bg-gray-400"
          label="Unverified"
          title="Not yet matched to an active HR staff record - checked again at each sign-in"
        />
      )}
      {Boolean(user.duplicatePayroll) && (
        <Pill
          dot="bg-yellow-500"
          label="Duplicate payroll"
          title="Another account has the same payroll number"
        />
      )}
    </div>
  );
}
