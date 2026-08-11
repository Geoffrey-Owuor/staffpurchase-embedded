"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, FilterX, ChevronDown, X, Check } from "lucide-react";
import Select from "../Reusables/Select";

const inputClass =
  "w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white";

// A "field" always maps to one or more committed filter keys - every field is
// a single key except dateRange, which always writes/reads fromDate+toDate
// together so it can be staged, applied, and removed as one unit.
function committedKeysFor(field) {
  return field.type === "dateRange" ? ["fromDate", "toDate"] : [field.key];
}

// A field "has a value" (dot indicator, pill, clear button) if either its
// committed value or a pending staged edit is non-empty - staged wins when
// both are present, since that's what Apply would actually send.
function fieldHasValue(field, staged, committed) {
  return committedKeysFor(field).some((key) => {
    const value = key in staged ? staged[key] : committed[key];
    return value !== undefined && value !== null && value !== "";
  });
}

function isFieldCommitted(field, committed) {
  return committedKeysFor(field).some((key) => {
    const value = committed[key];
    return value !== undefined && value !== null && value !== "";
  });
}

function effectiveValue(key, staged, committed) {
  return (key in staged ? staged[key] : committed[key]) ?? "";
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

// Committed-filters UI: a single field selector picks which filter's editor
// shows to the right (defaulting to staff name, set in createFilterStore.js),
// with a dot marking any option that already has a staged or committed
// value. Editing writes straight to staged; "Apply filters" commits every
// staged field at once (one fetch). Committed filters show as pills
// afterward - removing a pill or hitting Reset takes effect immediately,
// without needing Apply. The selector deliberately keeps showing whichever
// field was last picked even after Apply/Reset, rather than going blank.
export default function FilterPanel({
  fields,
  committed,
  staged,
  stagedKeys,
  selectedField,
  onSelectField,
  onStagedValueChange,
  onClearStaged,
  onApply,
  onRemoveCommitted,
  onResetAll,
}) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setIsSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeField =
    fields.find((field) => field.key === selectedField) ?? fields[0];

  const stagedFields = fields.filter((field) =>
    committedKeysFor(field).some((key) => stagedKeys.includes(key)),
  );
  const committedFields = fields.filter((field) =>
    isFieldCommitted(field, committed),
  );

  const clearField = (field) => {
    const keys = committedKeysFor(field);
    onClearStaged(keys);
    onRemoveCommitted(keys);
  };

  const handleApply = () => {
    // Drop any staged field left incomplete rather than committing an empty filter.
    stagedFields.forEach((field) => {
      const incomplete =
        field.type === "dateRange"
          ? !effectiveValue("fromDate", staged, committed) ||
            !effectiveValue("toDate", staged, committed)
          : effectiveValue(field.key, staged, committed) === "";
      if (incomplete) onClearStaged(committedKeysFor(field));
    });
    onApply();
  };

  const hasAnything = stagedFields.length > 0 || committedFields.length > 0;
  const activeFieldHasValue =
    activeField && fieldHasValue(activeField, staged, committed);

  return (
    <div className="sticky top-0 z-20 mb-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative shrink-0" ref={selectorRef}>
          <button
            type="button"
            onClick={() => setIsSelectorOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Filter className="h-3.5 w-3.5" />
            {activeField?.label ?? "Filter"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${isSelectorOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {isSelectorOpen && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: -6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute z-10 mt-1 w-48 origin-top-left rounded-xl border border-gray-300 bg-white p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
              >
                {fields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => {
                      onSelectField(field.key);
                      setIsSelectorOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      field.key === activeField?.key
                        ? "font-medium text-gray-900 dark:text-white"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        fieldHasValue(field, staged, committed)
                          ? "bg-gray-900 dark:bg-white"
                          : "bg-transparent"
                      }`}
                    />
                    {field.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {activeField && (
          <div className="flex min-w-[16rem] flex-1 items-center gap-1.5">
            {activeField.type === "text" && (
              <input
                type="text"
                placeholder={activeField.placeholder}
                value={effectiveValue(activeField.key, staged, committed)}
                onChange={(e) =>
                  onStagedValueChange(activeField.key, e.target.value)
                }
                className={inputClass}
              />
            )}

            {activeField.type === "select" && (
              <Select
                className="w-full"
                value={effectiveValue(activeField.key, staged, committed)}
                onChange={(value) =>
                  onStagedValueChange(activeField.key, value)
                }
                options={activeField.options}
                placeholder={activeField.placeholder}
              />
            )}

            {activeField.type === "dateRange" && (
              <div className="flex w-full items-center gap-1.5">
                <input
                  type="date"
                  aria-label="From date"
                  value={effectiveValue("fromDate", staged, committed)}
                  onChange={(e) =>
                    onStagedValueChange("fromDate", e.target.value)
                  }
                  className={inputClass}
                />
                <span className="shrink-0 text-gray-400">to</span>
                <input
                  type="date"
                  aria-label="To date"
                  value={effectiveValue("toDate", staged, committed)}
                  onChange={(e) =>
                    onStagedValueChange("toDate", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            )}

            {activeFieldHasValue && (
              <button
                type="button"
                onClick={() => clearField(activeField)}
                title="Clear this filter"
                className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {stagedFields.length > 0 && (
          <button
            type="button"
            onClick={handleApply}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            <Check className="h-3.5 w-3.5" />
            Apply filters
          </button>
        )}

        {hasAnything && (
          <button
            type="button"
            onClick={onResetAll}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-3.5 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
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
    </div>
  );
}
