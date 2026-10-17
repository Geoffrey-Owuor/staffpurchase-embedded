"use client";
import { useState } from "react";

// Small, dependency-free chart pieces for the admin Analytics page. Every
// chart here is a single series, so it uses one hue (series slot 1 -
// #2a78d6 light / #3987e5 dark) with text in the normal text colours, never
// the series colour. Marks: bars/columns <= 24px thick; bar-list bars are
// rounded at both ends, columns at the data end (square at the baseline);
// values in tooltips and, for the monthly columns, a table view.

const SERIES_FILL = "bg-[#2a78d6] dark:bg-[#3987e5]";
const TRACK = "bg-gray-100 dark:bg-gray-800";

const compactNumber = new Intl.NumberFormat("en-KE", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fullNumber = new Intl.NumberFormat("en-KE");

export const formatCount = (value) =>
  value >= 1000 ? compactNumber.format(value) : fullNumber.format(value);
export const formatKsh = (value) => `Ksh ${compactNumber.format(value)}`;
export const formatKshFull = (value) =>
  `Ksh ${fullNumber.format(Math.round(value))}`;

export function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 ${className}`}
    >
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Stat tile: label, value, optional note (sentence case, no colon).
export function StatTile({ label, value, note }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
      {note && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{note}</p>
      )}
    </div>
  );
}

// Horizontal bar list: one row per category, value at the bar tip. Rows
// are ranked by the caller. `format` renders the value (a row's own
// `display` text wins, e.g. "No decisions"); `detail` (optional) adds a
// secondary figure to the tooltip/title.
export function BarList({ rows, format = formatCount, detail, empty }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {empty ?? "No data for this period"}
      </p>
    );
  }
  const max = Math.max(...rows.map((row) => row.value), 0) || 1;

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const description = [
          row.label,
          row.display ?? format(row.value),
          detail?.(row),
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li
            key={row.key ?? row.label}
            title={description}
            aria-label={description}
            className="group"
          >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate text-gray-700 dark:text-gray-300">
                {row.label}
              </span>
              <span className="shrink-0 font-semibold text-gray-900 tabular-nums dark:text-white">
                {row.display ?? format(row.value)}
              </span>
            </div>
            <div className={`h-3 w-full ${TRACK} rounded-[4px]`}>
              <div
                className={`h-3 rounded-[4px] ${SERIES_FILL} transition-opacity group-hover:opacity-80`}
                style={{
                  width: `${Math.max((row.value / max) * 100, row.value > 0 ? 1 : 0)}%`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const monthLabel = (month, withYear = false) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", {
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });

// Single-series column chart over months, with a hover/focus tooltip per
// column and a table view underneath. `points`: [{ month, value }].
export function MonthlyColumns({ points, format = formatCount, title }) {
  const [active, setActive] = useState(null);
  const max = Math.max(...points.map((p) => p.value), 0);
  const hasData = max > 0;
  const top = hasData ? max : 1;
  // Label every month when there are few, otherwise every 3rd
  const labelEvery = points.length > 12 ? 3 : 1;

  return (
    <div>
      <div className="relative">
        {/* Gridline at the top value, recessive */}
        <div
          className="flex items-end justify-between gap-0.5 border-b border-gray-200 pt-6 dark:border-gray-800"
          style={{ height: 160 }}
        >
          {points.map((point, index) => {
            const height = (point.value / top) * 100;
            const text = `${monthLabel(point.month, true)}: ${format(point.value)}`;
            return (
              <button
                key={point.month}
                type="button"
                aria-label={text}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="relative flex h-full flex-1 cursor-default items-end justify-center focus:outline-none"
              >
                <span
                  className={`w-full max-w-[24px] rounded-t-[4px] ${SERIES_FILL} ${
                    active === index ? "opacity-80" : ""
                  }`}
                  style={{
                    height: `${height}%`,
                    minHeight: point.value > 0 ? 2 : 0,
                  }}
                />
                {active === index && (
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow dark:bg-gray-100 dark:text-gray-900">
                    <span className="font-semibold">{format(point.value)}</span>{" "}
                    <span className="opacity-75">
                      {monthLabel(point.month, true)}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {hasData && (
          <span className="absolute top-0 left-0 text-[11px] text-gray-500 tabular-nums dark:text-gray-400">
            Max {format(max)}
          </span>
        )}
      </div>
      <div className="mt-1 flex justify-between gap-0.5">
        {points.map((point, index) => (
          <span
            key={point.month}
            className="flex-1 text-center text-[10px] text-gray-500 dark:text-gray-400"
          >
            {index % labelEvery === 0 ? monthLabel(point.month) : ""}
          </span>
        ))}
      </div>
      {!hasData && (
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          No data for this period
        </p>
      )}
      <details className="mt-3 text-xs text-gray-600 dark:text-gray-400">
        <summary className="cursor-pointer select-none">View as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-gray-500 dark:text-gray-400">
              <th className="py-1 font-medium">Month</th>
              <th className="py-1 text-right font-medium">{title}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {points.map((point) => (
              <tr
                key={point.month}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="py-1">{monthLabel(point.month, true)}</td>
                <td className="py-1 text-right">{format(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
