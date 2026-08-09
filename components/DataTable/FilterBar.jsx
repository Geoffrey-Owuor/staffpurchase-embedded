"use client";
import { SearchX } from "lucide-react";
import Select from "../Reusables/Select";

const inputClass =
  "rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white";

// fields: [{ key, label, type: "text" | "select" | "dateRange", placeholder?, options? }]
// values: the live filters object (DataTable passes useTableQuery's `filters`)
// Filters combine (AND) - every populated field contributes to the query at once,
// there is no single "active filter type" to pick anymore.
export default function FilterBar({
  fields,
  values,
  onChange,
  onClearAll,
  resultCount,
}) {
  const hasAnyValue = fields.some((field) => {
    if (field.type === "dateRange") return values.fromDate || values.toDate;
    return Boolean(values[field.key]);
  });

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-3">
        {fields.map((field) => {
          if (field.type === "text") {
            return (
              <input
                key={field.key}
                type="text"
                placeholder={field.placeholder}
                value={values[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={inputClass}
              />
            );
          }

          if (field.type === "select") {
            return (
              <Select
                key={field.key}
                value={values[field.key] || ""}
                onChange={(value) => onChange(field.key, value)}
                options={field.options}
                placeholder={field.placeholder}
              />
            );
          }

          if (field.type === "dateRange") {
            return (
              <div key={field.key} className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="From date"
                  value={values.fromDate || ""}
                  onChange={(e) => onChange("fromDate", e.target.value)}
                  className={inputClass}
                />
                <span className="text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="date"
                  aria-label="To date"
                  value={values.toDate || ""}
                  onChange={(e) => onChange("toDate", e.target.value)}
                  className={inputClass}
                />
              </div>
            );
          }

          return null;
        })}

        {hasAnyValue && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 rounded-md bg-gray-700 px-3 py-1 text-sm text-white hover:bg-gray-800 dark:bg-gray-300 dark:text-gray-900 dark:hover:bg-white"
          >
            <SearchX className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {hasAnyValue && (
        <div className="mt-2 px-1 text-xs text-gray-400 dark:text-gray-500">
          {resultCount} result{resultCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
