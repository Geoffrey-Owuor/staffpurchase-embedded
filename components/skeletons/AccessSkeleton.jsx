// Loading state for the admin Access page - mirrors one permission card
// (components/Admin/Access/AdminAccessPage.jsx): heading, description,
// counts, the grant search field and a couple of holder rows.

// Same shimmer as SkeletonBox, with its own rounding/size per shape.
function Shimmer({ className = "" }) {
  return <div className={`details-shimmer ${className}`} />;
}

export default function AccessSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading access">
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <Shimmer className="h-5 w-28 rounded-md" />
        <Shimmer className="mt-2 h-4 w-[32rem] max-w-full rounded-md" />
        <Shimmer className="mt-2.5 h-3 w-44 rounded-md" />

        <Shimmer className="mt-4 h-4 w-28 rounded-md" />
        <Shimmer className="mt-1.5 h-9 w-full rounded-xl" />

        <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {[1, 2].map((i) => (
            <li
              key={i}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Shimmer className="h-4 w-32 rounded-md" />
                  <Shimmer className="h-5 w-24 rounded-[9px]" />
                </div>
                <Shimmer className="h-3 w-56 max-w-full rounded-md" />
                <Shimmer className="h-3 w-48 max-w-full rounded-md" />
              </div>
              <Shimmer className="h-7 w-20 rounded-lg" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
