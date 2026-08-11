import React from "react";
import { FolderClock } from "lucide-react";

const ChangelogSkeleton = () => {
  return (
    <div>
      {/* Masthead skeleton */}
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
        </div>
      </section>

      {/* Changelogs area skeleton */}
      <div className="bg-white px-4 py-16 md:px-8 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl">
          <div className="relative space-y-6">
            {/* Vertical timeline line */}
            <div className="absolute top-2 bottom-2 left-6 w-px bg-gray-100 dark:bg-gray-800" />

            {/* Skeleton items */}
            {[...Array(5)].map((_, index) => (
              <div key={index} className="relative pl-10">
                {/* Timeline Dot */}
                <div className="absolute top-6 left-2 h-3 w-3 -translate-x-1/2 animate-pulse rounded-full bg-gray-300 dark:bg-gray-600" />

                {/* Content */}
                <div className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    {/* Category badge skeleton */}
                    <div className="h-5 w-20 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />

                    {/* Date skeleton */}
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>

                  {/* Title skeleton */}
                  <div className="mt-1 h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />

                  {/* Description skeleton - multiple lines */}
                  <div className="mt-1 space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Note skeleton */}
          <div className="mt-12 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-900/40 dark:bg-blue-900/20">
            <div className="h-4 w-3/4 animate-pulse rounded bg-blue-200 dark:bg-blue-800" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangelogSkeleton;
