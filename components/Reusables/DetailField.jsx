// Reusable Detail Field Component
// Values keep the line breaks and spacing they were typed with (textarea
// fields such as comments and Other Details); break-words stops a long
// unbroken string (URL, reference) from overflowing the column.
export default function DetailField({ label, value }) {
  const display = typeof value === "string" ? value.trim() : value;
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 font-semibold break-words whitespace-pre-wrap text-gray-900 dark:text-white">
        {display || "N/A"}
      </p>
    </div>
  );
}
