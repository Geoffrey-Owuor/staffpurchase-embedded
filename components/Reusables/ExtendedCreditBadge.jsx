// Marks a request whose credit period was only on offer through an extended
// credit window (purchasesinfo.credit_extension_id), so Credit Control can
// see it's an exceptional term. A span, so it can sit inside a <p>.
export default function ExtendedCreditBadge({ windowName }) {
  return (
    <span
      title={
        windowName
          ? `Chosen during the extended credit window "${windowName}"`
          : "Chosen during an extended credit window"
      }
      className="inline-flex items-center gap-x-1 rounded-[9px] border border-gray-200 px-2 py-0.5 align-middle whitespace-nowrap dark:border-gray-700"
    >
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        Extended credit
      </span>
    </span>
  );
}
