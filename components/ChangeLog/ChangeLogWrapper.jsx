"use client";
import { FolderClock, Calendar, RotateCcw, Info } from "lucide-react";
import { revalidateChangelogs } from "@/app/lib/fetchChangelogs";
import { useTransition } from "react";
import { LoadingBar } from "../Reusables/LoadingBar";

// Date formatting helper function to format dates for the ui
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const categoryColors = {
  Feature:
    "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  Improvement:
    "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
  Performance:
    "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
};

const ChangeLogWrapper = ({ changelogs }) => {
  const [isPending, startTransition] = useTransition();

  const handleRefreshLogs = () =>
    startTransition(async () => await revalidateChangelogs());
  return (
    <>
      <LoadingBar isLoading={isPending} />

      {/* Masthead */}
      <section className="bg-conditions px-4 pt-28 pb-14 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700 uppercase dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400">
            <FolderClock className="h-3.5 w-3.5" />
            Product Updates
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white">
            What's New
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-400">
            A running record of updates, improvements, and fixes across the
            Staff Purchase Portal.
          </p>
          <button
            className="mx-auto mt-6 hidden cursor-pointer items-center gap-2 rounded-full bg-gray-950 px-4 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-md sm:flex dark:bg-white dark:text-black dark:hover:bg-gray-200"
            onClick={handleRefreshLogs}
          >
            <RotateCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      {/* Changelogs area */}
      <div className="bg-white px-4 py-16 md:px-8 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl">
          <div className="relative space-y-6">
            {/* Vertical timeline line */}
            <div className="absolute top-2 bottom-2 left-6 w-px bg-gray-100 dark:bg-gray-800" />

            {changelogs.map((log) => (
              <div key={log.id} className="group relative pl-10">
                {/* Timeline Dot */}
                <div className="absolute top-6 left-2 h-3 w-3 -translate-x-1/2 rounded-full bg-gray-300 transition-colors group-hover:bg-blue-500 dark:bg-gray-600" />

                {/* Content */}
                <div className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-900/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase ${categoryColors[log.category] || "bg-gray-100 text-gray-600"}`}
                      >
                        {log.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-1 text-base font-medium text-gray-900 dark:text-gray-100">
                    {log.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {log.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="mt-12 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-900/40 dark:bg-blue-900/20">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
            <p className="text-left text-sm font-medium text-blue-800 dark:text-blue-200">
              This changelog is provided for informational purposes only and
              may not include every change. Features and fixes may vary by
              environment or configuration.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChangeLogWrapper;
