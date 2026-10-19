// Loading state for the admin Reference Data page - mirrors its layout
// (components/Admin/ReferenceDataPage.jsx): the Settings card, then the
// invoicing locations and departments lists with their add rows.

// Same shimmer as SkeletonBox, with its own rounding/size per shape.
function Shimmer({ className = "" }) {
  return <div className={`details-shimmer ${className}`} />;
}

const sectionClass =
  "rounded-xl border border-gray-200 p-4 dark:border-gray-800";

function SectionHeading({ wide = false }) {
  return (
    <>
      <Shimmer className="h-5 w-40 rounded-md" />
      <Shimmer
        className={`mt-1.5 mb-4 h-3 rounded-md ${wide ? "w-96 max-w-full" : "w-64"}`}
      />
    </>
  );
}

function ListSkeleton({ withCode }) {
  return (
    <section className={sectionClass}>
      <SectionHeading wide />
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <li
            key={i}
            className="flex flex-col gap-2 py-2 md:flex-row md:items-center"
          >
            <div className="flex items-center gap-1">
              <Shimmer className="h-7 w-8 rounded-lg" />
              <Shimmer className="h-7 w-8 rounded-lg" />
              {withCode && <Shimmer className="ml-1 h-3 w-20 rounded-md" />}
            </div>
            <Shimmer className="h-9 flex-1 rounded-xl" />
            <Shimmer className="h-8 w-24 rounded-lg" />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-4 md:flex-row dark:border-gray-800">
        {withCode && <Shimmer className="h-9 rounded-xl md:w-40" />}
        <Shimmer className="h-9 flex-1 rounded-xl" />
        <Shimmer className="h-9 w-16 rounded-lg" />
      </div>
    </section>
  );
}

export default function ReferenceDataSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading reference data"
    >
      <section className={sectionClass}>
        <Shimmer className="mb-3 h-5 w-24 rounded-md" />
        <Shimmer className="mb-1 h-4 w-36 rounded-md" />
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Shimmer className="h-10 rounded-xl md:w-72" />
          <Shimmer className="h-10 w-20 rounded-lg" />
          <Shimmer className="h-3 w-64 rounded-md" />
        </div>
      </section>
      <ListSkeleton withCode />
      <ListSkeleton />
    </div>
  );
}
