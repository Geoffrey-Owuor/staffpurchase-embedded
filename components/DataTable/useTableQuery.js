"use client";
import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { createFilterStore } from "./createFilterStore";

// Drives a filterable, paginated, server-backed table.
// - `queryKeyPrefix`: react-query key prefix (e.g. ["purchases"]) - kept stable so
//   other components can prefix-invalidate every filter/page variant at once.
// - `fetchFn(params)`: called with { ...committedFilters, page, pageSize }, must
//   return { data, total, totalPages }.
// - Filters only reach the server once committed via `applyFilters` (see
//   createFilterStore.js) - building up staged field values never fetches.
//   Any committed change (apply, pill removal, reset) resets the page to 1.
export function useTableQuery({
  queryKeyPrefix,
  fetchFn,
  initialPageSize = 10,
}) {
  // One filter store per useTableQuery call (per table instance), not a
  // shared global - keeps StaffPurchasesTable/ApproverPurchasesTable/
  // PaymentTrackingTable filter state fully independent of each other.
  const [useFilterStore] = useState(() => createFilterStore());

  const committed = useFilterStore((state) => state.committed);
  const staged = useFilterStore((state) => state.staged);
  const stagedKeys = useFilterStore((state) => state.stagedKeys);
  const stageField = useFilterStore((state) => state.stageField);
  const unstageField = useFilterStore((state) => state.unstageField);
  const setStagedValue = useFilterStore((state) => state.setStagedValue);
  const applyFilters = useFilterStore((state) => state.applyFilters);
  const removeCommittedFilter = useFilterStore(
    (state) => state.removeCommittedFilter,
  );
  const resetAll = useFilterStore((state) => state.resetAll);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtersKey = JSON.stringify(committed);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const queryParams = { ...committed, page, pageSize };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: [...queryKeyPrefix, queryParams],
    queryFn: () => fetchFn(queryParams),
    placeholderData: keepPreviousData,
  });

  return {
    rows: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    page,
    pageSize,
    setPage,
    setPageSize: (size) => {
      setPageSize(size);
      setPage(1);
    },
    filters: committed,
    staged,
    stagedKeys,
    stageField,
    unstageField,
    setStagedValue,
    applyFilters,
    removeCommittedFilter,
    resetAll,
    isLoading,
    isFetching,
    isError,
    refetch,
  };
}
