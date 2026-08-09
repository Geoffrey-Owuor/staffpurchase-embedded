"use client";
import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import useDebounce from "../Reusables/Debouncing/useDebounce";

// Drives a filterable, paginated, server-backed table.
// - `queryKeyPrefix`: react-query key prefix (e.g. ["purchases"]) - kept stable so
//   other components can prefix-invalidate every filter/page variant at once.
// - `fetchFn(params)`: called with { ...activeFilters, page, pageSize }, must
//   return { data, total, totalPages }.
// - Every filter change (including free-text search) is debounced together and
//   resets the page back to 1, so callers never juggle "apply" buttons.
export function useTableQuery({
  queryKeyPrefix,
  fetchFn,
  initialFilters = {},
  debounceMs = 400,
  initialPageSize = 10,
}) {
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const activeFilters = useDebounce(draftFilters, debounceMs);
  const filtersKey = JSON.stringify(activeFilters);

  // Any committed filter change invalidates the current page.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const queryParams = { ...activeFilters, page, pageSize };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: [...queryKeyPrefix, queryParams],
    queryFn: () => fetchFn(queryParams),
    placeholderData: keepPreviousData,
  });

  const setFilter = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const removeFilter = (keys) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    setDraftFilters((prev) => {
      const next = { ...prev };
      for (const key of keyList) delete next[key];
      return next;
    });
  };

  const clearAllFilters = () => setDraftFilters({});

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
    filters: draftFilters,
    setFilter,
    removeFilter,
    clearAllFilters,
    isLoading,
    isFetching,
    isError,
    refetch,
  };
}
