export const StatCard = ({ title, count, description, IconComponent }) => {
  // Muted icon accent per status — card body stays neutral gray/white
  const dynamicIcons = {
    Pending:
      "bg-amber-50 text-amber-600 dark:bg-amber-700/30 dark:text-amber-400",
    Open: "bg-amber-50 text-amber-600 dark:bg-amber-700/30 dark:text-amber-400",
    Closed: "bg-sky-50 text-sky-600 dark:bg-sky-700/30 dark:text-sky-400",
    Declined: "bg-rose-50 text-rose-600 dark:bg-rose-700/30 dark:text-rose-400",
    Approved:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-700/30 dark:text-emerald-400",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-none dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {title}
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {count}
          </p>
        </div>
        <div className={`rounded-full p-3 ${dynamicIcons[title]}`}>
          <IconComponent className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-800 dark:text-gray-200">
        {description}
      </p>
    </div>
  );
};
