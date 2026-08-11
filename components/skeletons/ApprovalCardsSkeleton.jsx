export default function ApprovalCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative h-37 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="shimmer absolute inset-0" />
        </div>
      ))}
    </div>
  );
}
