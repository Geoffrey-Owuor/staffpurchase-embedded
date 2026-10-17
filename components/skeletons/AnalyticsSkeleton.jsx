// Loading state for the admin Analytics page - mirrors its layout
// (components/Admin/Analytics/AdminAnalyticsPage.jsx): section titles,
// stat tiles, monthly column cards and bar-list cards, in the same grids,
// so nothing jumps when the data arrives.

// Same shimmer as SkeletonBox, but takes its own rounding and inline size
// (columns and bars need exact shapes).
function Shimmer({ className = "", style }) {
  return <div className={`details-shimmer ${className}`} style={style} />;
}

const cardClass =
  "rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950";

// Fixed (not random) heights/widths so the skeleton is stable between renders
const COLUMN_HEIGHTS = [70, 20, 35, 15, 45, 25, 60, 30, 50, 20, 40, 55];
const BAR_WIDTHS = [90, 65, 45, 30];

function SectionTitle() {
  return <Shimmer className="mb-3 ml-1 h-5 w-44 rounded-md" />;
}

function StatTileSkeleton() {
  return (
    <div className={cardClass}>
      <Shimmer className="h-4 w-20 rounded-md" />
      <Shimmer className="mt-2 h-7 w-16 rounded-md" />
      <Shimmer className="mt-2 h-3 w-24 rounded-md" />
    </div>
  );
}

function ColumnCardSkeleton() {
  return (
    <div className={cardClass}>
      <Shimmer className="h-4 w-36 rounded-md" />
      <div className="mt-4 flex h-40 items-end justify-between gap-0.5 border-b border-gray-200 pt-6 dark:border-gray-800">
        {COLUMN_HEIGHTS.map((height, i) => (
          <div key={i} className="flex h-full flex-1 items-end justify-center">
            <Shimmer
              className="w-full max-w-[24px] rounded-t-[4px]"
              style={{ height: `${height}%` }}
            />
          </div>
        ))}
      </div>
      <Shimmer className="mt-3 h-3 w-24 rounded-md" />
    </div>
  );
}

function BarCardSkeleton() {
  return (
    <div className={cardClass}>
      <Shimmer className="h-4 w-36 rounded-md" />
      <Shimmer className="mt-1.5 h-3 w-48 rounded-md" />
      <div className="mt-4 space-y-3">
        {BAR_WIDTHS.map((width, i) => (
          <div key={i}>
            <div className="mb-1 flex justify-between">
              <Shimmer className="h-3 w-24 rounded-md" />
              <Shimmer className="h-3 w-8 rounded-md" />
            </div>
            <div className="h-3 w-full rounded-[4px] bg-gray-100 dark:bg-gray-800">
              <Shimmer
                className="h-3 rounded-[4px]"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading analytics">
      <div>
        <SectionTitle />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <StatTileSkeleton key={i} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ColumnCardSkeleton />
          <ColumnCardSkeleton />
        </div>
      </div>
      {[1, 2].map((section) => (
        <div key={section}>
          <SectionTitle />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <BarCardSkeleton />
            <BarCardSkeleton />
            <BarCardSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}
