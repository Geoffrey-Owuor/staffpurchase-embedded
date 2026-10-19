"use client";
import { useQuery } from "@tanstack/react-query";
import {
  CachedAppSettings,
  CachedDepartments,
  CachedInvoicingLocations,
} from "@/utils/Cache/CachedConditions";

// DB-managed dropdown data (admin Reference Data page). Every query key
// starts with "referenceData" so the admin page can refresh them all at once.
const STALE_MS = 10 * 60 * 1000;

// Options for a dropdown: active entries, plus the current value if it has
// since been deactivated (so an existing record still shows its label).
function buildOptions(entries, currentValue, toOption) {
  return entries
    .filter(
      (entry) => entry.is_active || toOption(entry).value === currentValue,
    )
    .map(toOption);
}

const locationOption = (location) => ({
  value: location.code,
  label: location.label,
});

export function useInvoicingLocations(currentValue) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["referenceData", "invoicingLocations"],
    queryFn: () => CachedInvoicingLocations(),
    staleTime: STALE_MS,
  });

  return {
    isLoading,
    options: buildOptions(data, currentValue, locationOption),
    // Display label for a stored code (falls back to the code itself)
    labelFor: (code) =>
      data.find((location) => location.code === code)?.label ?? code,
  };
}

const departmentOption = (department) => ({
  value: department.name,
  label: department.name,
});

export function useDepartments(currentValue) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["referenceData", "departments"],
    queryFn: () => CachedDepartments(),
    staleTime: STALE_MS,
  });

  return {
    isLoading,
    departments: data,
    options: buildOptions(data, currentValue, departmentOption),
    // Every department, active or not - for filters over existing data
    allOptions: data.map(departmentOption),
  };
}

export function useAppSettings() {
  const { data = {}, isLoading } = useQuery({
    queryKey: ["referenceData", "appSettings"],
    queryFn: () => CachedAppSettings(),
    staleTime: STALE_MS,
  });
  return { settings: data, isLoading };
}
