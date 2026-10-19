"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import Select from "../../Reusables/Select";
import AnalyticsSkeleton from "../../skeletons/AnalyticsSkeleton";
import {
  BarList,
  ChartCard,
  MonthlyColumns,
  StatTile,
  formatCount,
  formatKsh,
  formatKshFull,
} from "./Charts";
import { fetchAdminAnalytics } from "@/utils/FetchAdmin/fetchAdmin";
import { ROLE_LABELS } from "@/utils/Admin/adminConstants";
import { PRICE_CODE_LABELS } from "@/utils/Pricing/priceCodes";

const RANGE_OPTIONS = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

// Status filter for the value, monthly, breakdown and product figures. Each
// status ranges on the date requests reached it (see the analytics route).
const STATUS_OPTIONS = [
  {
    value: "approved",
    label: "Approved",
    valueLabel: "Approved spend",
    dateBasis: "BI approval date",
  },
  {
    value: "inProgress",
    label: "In progress",
    valueLabel: "In-progress value",
    dateBasis: "submission date",
  },
  {
    value: "declined",
    label: "Declined",
    valueLabel: "Declined value",
    dateBasis: "decline date",
  },
  {
    value: "all",
    label: "All submitted",
    valueLabel: "Requested value",
    dateBasis: "submission date",
  },
];

const PAYMENT_TERMS_LABELS = {
  CASH: "Cash",
  CREDIT: "Credit",
  "CASH AND CREDIT": "Cash & Credit",
};

const toIsoDate = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// { fromDate, toDate } for a range preset ({} = all time)
function rangeFilters(range) {
  if (range === "all") return {};
  const to = new Date();
  const from = new Date();
  if (range === "30d") from.setDate(from.getDate() - 29);
  else if (range === "90d") from.setDate(from.getDate() - 89);
  else from.setMonth(from.getMonth() - 11, 1);
  return { fromDate: toIsoDate(from), toDate: toIsoDate(to) };
}

const percent = (part, whole) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";

// Rows for BarList from API rows ({label, count, value})
const rowsBy = (rows, metric, labelFor = (label) => label) =>
  rows.map((row) => ({
    key: row.code ?? row.label,
    label: labelFor(row.label, row),
    value: row[metric],
    count: row.count,
    amount: row.value,
  }));

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("12m");
  const [status, setStatus] = useState("approved");
  const filters = useMemo(
    () => ({ ...rangeFilters(range), status }),
    [range, status],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminAnalytics", filters],
    queryFn: () => fetchAdminAnalytics(filters),
  });

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label;

  return (
    <div className="px-2 pb-8">
      {/* Filters live in one row above the charts */}
      <div className="mt-3 mb-5 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <BarChart3 className="h-5 w-5" />
            Analytics
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Request counts and the approval pipeline cover requests submitted
            in the period; value, monthly, breakdown and product figures follow
            the status filter. User figures are all-time.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            id="analytics-status"
            className="sm:w-44"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
          />
          <Select
            id="analytics-range"
            className="sm:w-44"
            value={range}
            onChange={setRange}
            options={RANGE_OPTIONS}
          />
        </div>
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : isError || !data ? (
        <p className="py-10 text-center text-sm text-red-500">
          Failed to load analytics. Please try refreshing the page.
        </p>
      ) : (
        <Dashboard data={data} rangeLabel={rangeLabel} />
      )}
    </div>
  );
}

function Dashboard({ data, rangeLabel }) {
  const { users, requests, products } = data;
  const lineCount = products.itemStatus.reduce((sum, r) => sum + r.count, 0);
  // From the response, so labels always match the figures shown
  const statusMeta =
    STATUS_OPTIONS.find((o) => o.value === data.status) ?? STATUS_OPTIONS[0];
  const isAll = statusMeta.value === "all";

  return (
    <div className="space-y-8">
      {/* ---- Requests ---- */}
      <div>
        <h3 className="mb-3 px-1 text-base font-semibold text-gray-900 dark:text-white">
          Requests · {rangeLabel}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile label="Requests" value={formatCount(requests.total)} />
          <StatTile
            label={statusMeta.valueLabel}
            value={formatKsh(requests.value)}
            note={
              isAll
                ? formatKshFull(requests.value)
                : `${formatKsh(requests.requestedValue)} requested in period`
            }
          />
          <StatTile
            label="In progress"
            value={formatCount(requests.inProgress)}
            note={`${percent(requests.inProgress, requests.total)} of requests`}
          />
          <StatTile
            label="Fully approved"
            value={formatCount(requests.approved)}
            note={`${formatCount(requests.awaitingClosure)} awaiting closure`}
          />
          <StatTile
            label="Declined"
            value={formatCount(requests.declined)}
            note={`${percent(requests.declined, requests.total)} of requests`}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title={
              isAll
                ? "Requests per month"
                : `${statusMeta.label} requests per month`
            }
            subtitle={`By ${statusMeta.dateBasis}`}
          >
            <MonthlyColumns
              points={requests.byMonth.map((p) => ({
                month: p.month,
                value: p.count,
              }))}
              title="Requests"
            />
          </ChartCard>
          <ChartCard
            title={`${statusMeta.valueLabel} per month`}
            subtitle={`Sum of discounted product values, by ${statusMeta.dateBasis}`}
          >
            <MonthlyColumns
              points={requests.byMonth.map((p) => ({
                month: p.month,
                value: p.value,
              }))}
              format={formatKsh}
              title="Value"
            />
          </ChartCard>
        </div>
      </div>

      {/* ---- Pipeline ---- */}
      <div>
        <h3 className="mb-3 px-1 text-base font-semibold text-gray-900 dark:text-white">
          Approval pipeline
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title="Waiting at each stage"
            subtitle="Pending there, with every earlier stage approved"
          >
            <BarList
              rows={requests.stages.map((s) => ({
                key: s.key,
                label: s.label,
                value: s.waiting,
              }))}
            />
          </ChartCard>
          <ChartCard
            title="Average days per stage"
            subtitle="From the previous decision (Payroll: from submission; cash auto-approvals excluded)"
          >
            <BarList
              rows={requests.stages.map((s) => ({
                key: s.key,
                label: s.label,
                value: s.avgDays ?? 0,
                decided: s.decided,
                // No decisions in the period isn't "0 days"
                display: s.decided === 0 ? "No decisions" : undefined,
              }))}
              format={(v) => `${v} days`}
              detail={(row) => `${row.decided} decided`}
            />
          </ChartCard>
          <ChartCard title="Declined at each stage">
            <BarList
              rows={requests.stages.map((s) => ({
                key: s.key,
                label: s.label,
                value: s.declined,
              }))}
            />
          </ChartCard>
        </div>
      </div>

      {/* ---- Volume & value ---- */}
      <div>
        <h3 className="mb-3 px-1 text-base font-semibold text-gray-900 dark:text-white">
          Volume & value · {statusMeta.label}
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title="Value by department"
            subtitle="Department on the request"
          >
            <BarList
              rows={rowsBy(requests.byDepartment, "value")}
              format={formatKsh}
              detail={(row) => `${row.count} requests`}
            />
          </ChartCard>
          <ChartCard title="Value by payment terms">
            <BarList
              rows={rowsBy(
                requests.byPaymentTerms,
                "value",
                (label) => PAYMENT_TERMS_LABELS[label] ?? label,
              )}
              format={formatKsh}
              detail={(row) => `${row.count} requests`}
            />
          </ChartCard>
          <ChartCard title="Value by invoicing location">
            <BarList
              rows={rowsBy(requests.byLocation, "value")}
              format={formatKsh}
              detail={(row) => `${row.count} requests`}
            />
          </ChartCard>
        </div>
      </div>

      {/* ---- Products ---- */}
      <div>
        <h3 className="mb-3 px-1 text-base font-semibold text-gray-900 dark:text-white">
          Products · {statusMeta.label} · {formatCount(lineCount)} line items
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title={
              statusMeta.value === "approved"
                ? "Most purchased products"
                : "Most requested products"
            }
            subtitle="Top 10 by line items"
          >
            <BarList
              rows={rowsBy(
                products.top,
                "count",
                (label, row) => label || row.code,
              )}
              detail={(row) => `${row.key} · ${formatKsh(row.amount)}`}
            />
          </ChartCard>
          <ChartCard
            title="Winning price basis"
            subtitle="Which price each line item was charged at"
          >
            <BarList
              rows={rowsBy(
                products.priceBasis,
                "count",
                (label) => PRICE_CODE_LABELS[label] ?? label,
              )}
              detail={(row) => formatKsh(row.amount)}
            />
          </ChartCard>
          <ChartCard title="New vs RHD2">
            <BarList
              rows={rowsBy(products.itemStatus, "count")}
              detail={(row) => formatKsh(row.amount)}
            />
          </ChartCard>
        </div>
      </div>

      {/* ---- Users ---- */}
      <div>
        <h3 className="mb-3 px-1 text-base font-semibold text-gray-900 dark:text-white">
          Users · all-time
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Users" value={formatCount(users.total)} />
          <StatTile label="Active" value={formatCount(users.active)} />
          <StatTile
            label="Locked"
            value={formatCount(users.locked)}
            note="Too many failed sign-ins"
          />
          <StatTile
            label="Deactivated"
            value={formatCount(users.deactivated)}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Users by role">
            <BarList
              rows={rowsBy(
                users.byRole,
                "count",
                (label) => ROLE_LABELS[label] ?? label,
              )}
            />
          </ChartCard>
          <ChartCard title="Users by department">
            <BarList rows={rowsBy(users.byDepartment, "count")} />
          </ChartCard>
          <ChartCard title="Registrations per month" subtitle="Last 12 months">
            <MonthlyColumns
              points={users.registrationsByMonth.map((p) => ({
                month: p.month,
                value: p.count,
              }))}
              title="Registrations"
            />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
