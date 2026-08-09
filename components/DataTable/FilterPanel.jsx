"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, FilterX, ChevronDown, X, Check, Lightbulb } from "lucide-react";
import Select from "../Reusables/Select";

const inputClass =
  "rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white";

// A "field" always maps to one or more committed filter keys - every field is
// a single key except dateRange, which always writes/reads fromDate+toDate
// together so it can be staged, applied, and removed as one unit.
function committedKeysFor(field) {
  return field.type === "dateRange" ? ["fromDate", "toDate"] : [field.key];
}

function isFieldStaged(field, stagedKeys) {
  return committedKeysFor(field).some((key) => stagedKeys.includes(key));
}

function isFieldCommitted(field, committed) {
  return committedKeysFor(field).some((key) => {
    const value = committed[key];
    return value !== undefined && value !== null && value !== "";
  });
}

function formatPillLabel(field, committed) {
  if (field.type === "dateRange") {
    return `${field.label}: ${committed.fromDate} → ${committed.toDate}`;
  }
  if (field.type === "select") {
    const option = field.options.find((o) => o.value === committed[field.key]);
    return `${field.label}: ${option?.label ?? committed[field.key]}`;
  }
  return `${field.label}: ${committed[field.key]}`;
}

// Committed-filters UI: pick a field from "+ Add filter", fill in its value,
// repeat for as many fields as needed, then "Apply" commits all of them at
// once (one fetch). Committed filters show as pills afterward - removing a
// pill or hitting Reset takes effect immediately, without needing Apply.
export default function FilterPanel({
  fields,
  committed,
  staged,
  stagedKeys,
  onStageField,
  onUnstageField,
  onStagedValueChange,
  onApply,
  onRemoveCommitted,
  onResetAll,
  resultCount,
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const addMenuRef = useRef(null);
  const hasAutoStagedRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setIsAddOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Stage the staff-name search field by default (once per mount) so the
  // panel never looks entirely blank before a user picks a filter. Skipped
  // if it's already staged/committed (e.g. restored from a persisted store)
  // or if this table has no such field (StaffPurchasesTable).
  useEffect(() => {
    if (hasAutoStagedRef.current) return;
    hasAutoStagedRef.current = true;
    const staffNameField = fields.find((field) => field.key === "search");
    if (
      staffNameField &&
      !isFieldStaged(staffNameField, stagedKeys) &&
      !isFieldCommitted(staffNameField, committed)
    ) {
      onStageField(staffNameField.key, committed[staffNameField.key] ?? "");
    }
  }, [fields, stagedKeys, committed, onStageField]);

  const availableFields = fields.filter(
    (field) =>
      !isFieldStaged(field, stagedKeys) && !isFieldCommitted(field, committed),
  );
  const stagedFields = fields.filter((field) =>
    isFieldStaged(field, stagedKeys),
  );
  const committedFields = fields.filter((field) =>
    isFieldCommitted(field, committed),
  );

  const addField = (field) => {
    if (field.type === "dateRange") {
      onStageField("fromDate", committed.fromDate ?? "");
      onStageField("toDate", committed.toDate ?? "");
    } else {
      onStageField(field.key, committed[field.key] ?? "");
    }
    setIsAddOpen(false);
  };

  const cancelField = (field) => {
    committedKeysFor(field).forEach((key) => onUnstageField(key));
  };

  const handleApply = () => {
    // Drop any staged field left incomplete rather than committing an empty filter.
    stagedFields.forEach((field) => {
      const incomplete =
        field.type === "dateRange"
          ? !staged.fromDate || !staged.toDate
          : staged[field.key] === "" || staged[field.key] == null;
      if (incomplete) cancelField(field);
    });
    onApply();
  };

  const hasAnything = stagedFields.length > 0 || committedFields.length > 0;

  return (
    <div className="sticky top-0 z-20 mb-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setIsAddOpen((open) => !open)}
            disabled={availableFields.length === 0}
            className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Filter className="h-3.5 w-3.5" />
            Add filter
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${isAddOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {isAddOpen && availableFields.length > 0 && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: -6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute z-10 mt-1 w-48 origin-top-left rounded-xl border border-gray-300 bg-white p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
              >
                {availableFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => addField(field)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {field.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {committedFields.length === 0 && (
          <div className="group relative flex items-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Lightbulb className="h-3.5 w-3.5" />
            </span>
            <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-center text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
              Pick a field from &quot;Add filter&quot;, set its value, then hit Apply to filter the table.
            </div>
          </div>
        )}

        {stagedFields.map((field) => (
          <div
            key={field.key}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 py-1 pr-1.5 pl-3 dark:border-gray-700"
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {field.label}
            </span>

            {field.type === "text" && (
              <input
                type="text"
                autoFocus
                placeholder={field.placeholder}
                value={staged[field.key] || ""}
                onChange={(e) => onStagedValueChange(field.key, e.target.value)}
                className={inputClass}
              />
            )}

            {field.type === "select" && (
              <Select
                value={staged[field.key] || ""}
                onChange={(value) => onStagedValueChange(field.key, value)}
                options={field.options}
                placeholder={field.placeholder}
              />
            )}

            {field.type === "dateRange" && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  aria-label="From date"
                  value={staged.fromDate || ""}
                  onChange={(e) =>
                    onStagedValueChange("fromDate", e.target.value)
                  }
                  className={inputClass}
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  aria-label="To date"
                  value={staged.toDate || ""}
                  onChange={(e) =>
                    onStagedValueChange("toDate", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => cancelField(field)}
              title="Cancel this filter"
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {stagedFields.length > 0 && (
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            <Check className="h-3.5 w-3.5" />
            Apply filters
          </button>
        )}

        {hasAnything && (
          <button
            type="button"
            onClick={onResetAll}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3.5 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FilterX className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {committedFields.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {committedFields.map((field) => (
            <span
              key={field.key}
              className="flex items-center gap-1.5 rounded-full bg-gray-800 py-1 pr-1.5 pl-3 text-xs font-medium text-white dark:bg-gray-200 dark:text-gray-900"
            >
              {formatPillLabel(field, committed)}
              <button
                type="button"
                onClick={() => onRemoveCommitted(committedKeysFor(field))}
                title="Remove this filter"
                className="rounded-full p-0.5 hover:bg-white/20 dark:hover:bg-black/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {committedFields.length > 0 && (
        <div className="mt-2 px-1 text-xs text-gray-400 dark:text-gray-500">
          {resultCount} result{resultCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
