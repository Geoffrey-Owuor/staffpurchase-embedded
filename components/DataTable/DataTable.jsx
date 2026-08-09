"use client";
import { RotateCcw } from "lucide-react";
import TableSkeleton from "../skeletons/TableSkeleton";
import { LoadingBar } from "../Reusables/LoadingBar";
import Pagination from "../pagination/Pagination";
import ColumnToggle from "../Reusables/ColumnToggle";
import FilterPanel from "./FilterPanel";

// Config-driven table shell shared by every purchases/payment-tracking view.
// columns: [{ key, label, title?, toggleable?, render(row) }]
//   - non-toggleable columns (reference number, staff, payroll, actions) always render
//   - toggleable columns are gated by `visibleColumns[key]`
export default function DataTable({
  heading,
  toolbarExtra,
  columns,
  visibleColumns,
  onColumnToggle,
  filterFields,
  filters,
  staged,
  stagedKeys,
  onStageField,
  onUnstageField,
  onStagedValueChange,
  onApplyFilters,
  onRemoveCommittedFilter,
  onResetAll,
  rows,
  total,
  totalPages,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  isError,
  onRefetch,
  renderActions,
  onRowClick,
  emptyMessage = "No purchase data found",
  filteredEmptyMessage = "No purchases match the active filters.",
  goingTo,
}) {
  const hasActiveFilters = filterFields?.some((field) => {
    if (field.type === "dateRange") return filters.fromDate || filters.toDate;
    return Boolean(filters[field.key]);
  });

  const visibleColumnList = columns.filter(
    (column) => !column.toggleable || visibleColumns[column.key],
  );

  return (
    <>
      {goingTo && <LoadingBar isLoading={true} />}

      <div className="rounded-xl px-2 pb-4">
        <div className="mb-4 flex flex-col space-y-6 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 md:mb-0">
          {heading}
          <div className="flex items-center gap-4">
            <button
              onClick={onRefetch}
              className="rounded-full bg-gray-100 p-2.5 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800"
              title="Refresh"
            >
              <RotateCcw className="h-4.5 w-4.5" />
            </button>
            {toolbarExtra}
            {onColumnToggle && (
              <ColumnToggle
                visibleColumns={visibleColumns}
                onToggle={onColumnToggle}
              />
            )}
          </div>
        </div>

        {filterFields && filterFields.length > 0 && (
          <FilterPanel
            fields={filterFields}
            committed={filters}
            staged={staged}
            stagedKeys={stagedKeys}
            onStageField={onStageField}
            onUnstageField={onUnstageField}
            onStagedValueChange={onStagedValueChange}
            onApply={onApplyFilters}
            onRemoveCommitted={onRemoveCommittedFilter}
            onResetAll={onResetAll}
            resultCount={total}
          />
        )}

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <div className="py-10 text-center text-sm text-red-500">
            Failed to load purchases. Please try refreshing the page.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl">
              <table className="mb-6 min-w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    {visibleColumnList.map((column) => (
                      <th
                        key={column.key}
                        className="max-w-[130px] truncate px-6 py-3 text-left text-sm font-semibold"
                        title={column.title ?? column.label}
                      >
                        {column.label}
                      </th>
                    ))}
                    {renderActions && (
                      <th className="px-6 py-3 text-left text-sm font-semibold" />
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-950">
                  {rows.length > 0 ? (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        className="transition-colors duration-200 odd:bg-white even:bg-gray-50 hover:cursor-pointer hover:bg-blue-50 dark:odd:bg-gray-950 dark:even:bg-gray-900 dark:hover:bg-[#1a2332]"
                        onClick={() => onRowClick?.(row)}
                      >
                        {visibleColumnList.map((column) => (
                          <td
                            key={column.key}
                            className="max-w-[200px] overflow-hidden px-6 py-4 text-sm text-ellipsis whitespace-nowrap text-gray-900 dark:text-white"
                          >
                            {column.render(row)}
                          </td>
                        ))}
                        {renderActions && (
                          <td className="px-6 py-4">{renderActions(row)}</td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={
                          visibleColumnList.length + (renderActions ? 1 : 0)
                        }
                        className="px-6 py-4 text-center text-sm whitespace-nowrap text-gray-500 dark:text-gray-400"
                      >
                        {hasActiveFilters ? filteredEmptyMessage : emptyMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              totalPages={totalPages}
              currentPage={page}
              rowsPerPage={pageSize}
              handlePageChange={onPageChange}
              onRowsPerPageChange={onPageSizeChange}
            />
          </>
        )}
      </div>
    </>
  );
}
