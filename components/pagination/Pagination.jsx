import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import Select from "../Reusables/Select";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((size) => ({
  value: String(size),
  label: String(size),
}));

export default function Pagination({
  totalPages,
  currentPage,
  rowsPerPage,
  totalResults,
  onRowsPerPageChange,
  handlePageChange,
}) {
  const rangeStart = totalResults === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const rangeEnd =
    totalResults === 0
      ? 0
      : Math.min(currentPage * rowsPerPage, totalResults);

  const renderPageNumbers = () => {
    // Always show first, last, current, and current's immediate neighbors;
    // collapse any gaps between those into an unclickable ellipsis.
    const pageSet = new Set([1, totalPages, currentPage]);
    if (currentPage - 1 >= 1) pageSet.add(currentPage - 1);
    if (currentPage + 1 <= totalPages) pageSet.add(currentPage + 1);
    const sortedPages = Array.from(pageSet).sort((a, b) => a - b);

    const items = [];
    sortedPages.forEach((page, index) => {
      if (index > 0 && page - sortedPages[index - 1] > 1) {
        items.push(
          <span
            key={`ellipsis-${page}`}
            className="mx-1 flex h-8 w-8 items-center justify-center text-gray-400 dark:text-gray-600"
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>,
        );
      }
      items.push(
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          className={`mx-1 flex h-8 w-8 items-center justify-center rounded-lg text-sm ${currentPage === page ? "bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900" : "bg-transparent text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"}`}
        >
          {page}
        </button>,
      );
    });
    return items;
  };

  return (
    <div className="mt-4 mb-1">
      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 sm:hidden">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 rounded-lg bg-gray-200 px-3 py-2 ring-1 ring-gray-300 disabled:opacity-50 dark:bg-gray-800 dark:ring-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={() =>
              handlePageChange(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 rounded-lg bg-gray-200 px-6 py-2 ring-1 ring-gray-300 disabled:opacity-50 dark:bg-gray-800 dark:ring-gray-700"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Desktop Pagination */}
      <div className="hidden items-center justify-between sm:flex">
        {/* Results summary + Rows Per Page Drop Down */}
        <div className="flex items-center gap-4">
          {typeof totalResults === "number" && (
            <span className="text-sm text-gray-700 dark:text-gray-400">
              Showing {rangeStart} to {rangeEnd} of {totalResults} results
            </span>
          )}
          <div className="items-center">
            <span className="mr-2 text-sm text-gray-700 dark:text-gray-400">
              Rows:
            </span>
            <Select
              value={String(rowsPerPage)}
              onChange={(value) => onRowsPerPageChange(Number(value))}
              options={ROWS_PER_PAGE_OPTIONS}
              openDirection="up"
            />
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="mx-1 flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-gray-900 hover:bg-gray-100 disabled:opacity-50 dark:text-white dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {renderPageNumbers()}
            <button
              onClick={() =>
                handlePageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="mx-1 flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-gray-900 hover:bg-gray-100 disabled:opacity-50 dark:text-white dark:hover:bg-gray-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
