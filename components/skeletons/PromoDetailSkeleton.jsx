import TableSkeleton from "./TableSkeleton";

// Loading state for a Staff Offer promo page - mirrors
// components/Admin/StaffOffers/StaffOfferPromoPage.jsx: the summary card
// (name, status + window, counts, action buttons), then the products table.

// Same shimmer as SkeletonBox, with its own rounding/size per shape.
function Shimmer({ className = "" }) {
  return <div className={`details-shimmer ${className}`} />;
}

export default function PromoDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading promo">
      <section className="mx-2 mt-3 mb-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <Shimmer className="h-6 w-56 max-w-full rounded-md" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Shimmer className="h-5 w-16 rounded-full" />
              <Shimmer className="h-4 w-64 max-w-full rounded-md" />
            </div>
            <Shimmer className="mt-2.5 h-4 w-96 max-w-full rounded-md" />
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {["w-20", "w-32", "w-28", "w-24"].map((width) => (
              <Shimmer key={width} className={`h-9 rounded-xl ${width}`} />
            ))}
          </div>
        </div>
      </section>
      <div className="mx-2 mb-4">
        <Shimmer className="h-4 w-80 max-w-full rounded-md" />
      </div>
      <div className="mx-2">
        <Shimmer className="mb-4 h-5 w-24 rounded-md" />
        <TableSkeleton />
      </div>
    </div>
  );
}
