"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Pencil, Plus, Save } from "lucide-react";
import Select from "../../Reusables/Select";
import PromoStatusBadge from "../StaffOffers/PromoStatusBadge";
import { formatPromoWindow, plural } from "../StaffOffers/staffOfferUi";
import CreditWindowModal from "./CreditWindowModal";
import {
  fetchAdminCreditPeriods,
  saveAdminCreditPeriods,
} from "@/utils/FetchAdmin/fetchAdmin";
import {
  CREDIT_PERIOD_LABEL_MAX_LENGTH,
  CREDIT_PERIOD_MAX_MONTHS,
} from "@/utils/Admin/adminConstants";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm focus:border-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white";
const buttonClass =
  "inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40";
const primaryButton = `${buttonClass} bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300`;
const outlineButton = `${buttonClass} border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800`;
const sectionClass =
  "rounded-xl border border-gray-200 p-4 dark:border-gray-800";

const AVAILABILITY_OPTIONS = [
  { value: "always", label: "Always offered" },
  { value: "extension", label: "Extension windows only" },
];

const activeToggleClass = (active) =>
  `${buttonClass} w-24 border ${
    active
      ? "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-950"
      : "border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
  }`;

// Credit periods + extended credit windows on the Reference Data page
// (GET/POST/PATCH /api/admin/credit-periods, rules in
// lib/adminCreditPeriods.js). `onResult({ type, message })` shows the
// page's alert.
export default function CreditPeriodsSection({ onResult }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminCreditPeriods"],
    queryFn: fetchAdminCreditPeriods,
  });
  const [busyKey, setBusyKey] = useState(null);
  // { window (null = new), key } - the key changes per open so the form resets
  const [editing, setEditing] = useState(null);

  const save = async (busy, method, body) => {
    setBusyKey(busy);
    try {
      const result = await saveAdminCreditPeriods(method, body);
      queryClient.setQueryData(["adminCreditPeriods"], result);
      queryClient.invalidateQueries({ queryKey: ["adminAuditLog"] });
      onResult({ type: "success", message: result.message });
      return true;
    } catch (error) {
      onResult({ type: "error", message: error.message });
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  if (isLoading) {
    return (
      <section className={sectionClass} aria-busy="true">
        <div className="details-shimmer h-5 w-40 rounded-md" />
        <div className="details-shimmer mt-3 h-40 rounded-xl" />
      </section>
    );
  }
  if (isError || !data) {
    return (
      <section className={sectionClass}>
        <p className="py-6 text-center text-sm text-red-500">
          Failed to load credit periods. Please try refreshing the page.
        </p>
      </section>
    );
  }

  const extensionPeriods = data.periods.filter(
    (period) => period.is_active && period.requires_extension,
  );

  return (
    <>
      <PeriodsList periods={data.periods} busyKey={busyKey} save={save} />
      <WindowsList
        windows={data.windows}
        canCreate={extensionPeriods.length > 0}
        busyKey={busyKey}
        save={save}
        onEdit={(creditWindow) =>
          setEditing({ window: creditWindow, key: Date.now() })
        }
      />
      <CreditWindowModal
        open={editing !== null}
        editing={editing}
        extensionPeriods={extensionPeriods}
        promos={data.promos}
        now={data.now}
        busy={busyKey === "window:form"}
        onClose={() => setEditing(null)}
        onSave={async (body) => {
          const ok = await save(
            "window:form",
            editing.window ? "PATCH" : "POST",
            editing.window
              ? { type: "window", key: editing.window.id, ...body }
              : { type: "window", ...body },
          );
          if (ok) setEditing(null);
        }}
      />
    </>
  );
}

function PeriodsList({ periods, busyKey, save }) {
  const [months, setMonths] = useState("");
  const [label, setLabel] = useState("");
  const [availability, setAvailability] = useState("always");
  const disabled = busyKey !== null;

  const handleAdd = async (e) => {
    e.preventDefault();
    const ok = await save("period:new", "POST", {
      type: "period",
      months,
      label,
      requiresExtension: availability === "extension",
    });
    if (ok) {
      setMonths("");
      setLabel("");
    }
  };

  return (
    <section className={sectionClass}>
      <h3 className="font-semibold text-gray-900 dark:text-white">
        Credit periods
      </h3>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Offered on the New Purchase form for credit requests. &quot;Always
        offered&quot; periods are available every day; &quot;Extension windows
        only&quot; periods only while an extended credit window below allows
        them. The month value is stored on each request and can&apos;t change;
        the label can.
      </p>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {periods.map((period) => (
          <PeriodRow
            key={period.period_value}
            period={period}
            busyKey={busyKey}
            save={save}
          />
        ))}
      </ul>

      <form
        onSubmit={handleAdd}
        className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-4 md:flex-row dark:border-gray-800"
      >
        <input
          type="number"
          aria-label="New period, in months"
          placeholder="Months"
          min={1}
          max={CREDIT_PERIOD_MAX_MONTHS}
          step={1}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          disabled={disabled}
          className={`${inputClass} md:w-28`}
        />
        <input
          aria-label="New period label"
          placeholder="Label (default: 'N months')"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={CREDIT_PERIOD_LABEL_MAX_LENGTH}
          disabled={disabled}
          className={inputClass}
        />
        <Select
          id="new-period-availability"
          value={availability}
          onChange={setAvailability}
          options={AVAILABILITY_OPTIONS}
          disabled={disabled}
          className="md:w-56"
        />
        <button
          type="submit"
          disabled={disabled || !months}
          className={primaryButton}
        >
          {busyKey === "period:new" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </button>
      </form>
    </section>
  );
}

function PeriodRow({ period, busyKey, save }) {
  const [label, setLabel] = useState(period.period_description ?? "");
  const rowKey = `period:${period.period_value}`;
  const disabled = busyKey !== null;
  const changed = label.trim() !== (period.period_description ?? "");
  const patch = (body) =>
    save(rowKey, "PATCH", {
      type: "period",
      key: period.period_value,
      ...body,
    });

  return (
    <li className="flex flex-col gap-2 py-2 md:flex-row md:items-center">
      <span className="w-16 shrink-0 font-mono text-xs text-gray-500 dark:text-gray-400">
        {period.period_value} mo
      </span>
      <input
        aria-label={`Label for ${period.period_value} months`}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        maxLength={CREDIT_PERIOD_LABEL_MAX_LENGTH}
        disabled={disabled}
        className={`${inputClass} ${period.is_active ? "" : "text-gray-400 dark:text-gray-500"}`}
      />
      <Select
        id={`period-availability-${period.period_value}`}
        value={period.requires_extension ? "extension" : "always"}
        onChange={(value) =>
          patch({ requires_extension: value === "extension" })
        }
        options={AVAILABILITY_OPTIONS}
        disabled={disabled}
        className="md:w-56 md:shrink-0"
      />
      <div className="flex items-center gap-2">
        <span className="text-xs whitespace-nowrap text-gray-500 md:w-20 md:text-right dark:text-gray-400">
          {plural(period.requestCount, "request")}
        </span>
        {changed && (
          <button
            type="button"
            onClick={() => patch({ label })}
            disabled={disabled}
            className={primaryButton}
          >
            {busyKey === rowKey ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
        )}
        <button
          type="button"
          onClick={() => patch({ is_active: !period.is_active })}
          disabled={disabled}
          aria-pressed={period.is_active}
          className={activeToggleClass(period.is_active)}
          title={period.is_active ? "Click to deactivate" : "Click to activate"}
        >
          {period.is_active ? "Active" : "Inactive"}
        </button>
      </div>
    </li>
  );
}

function WindowsList({ windows, canCreate, busyKey, save, onEdit }) {
  const disabled = busyKey !== null;

  return (
    <section className={sectionClass}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <CalendarClock className="h-4 w-4" />
            Extended credit windows
          </h3>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            While a window is live, every credit request may choose an
            extension-only period up to its max months. Requests submitted then
            keep their period, and Credit Control sees an &quot;Extended
            credit&quot; badge. Linking a promo only copies its dates - the
            window doesn&apos;t follow later promo changes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(null)}
          disabled={disabled || !canCreate}
          title={
            canCreate
              ? undefined
              : "Add or activate an extension-only credit period first"
          }
          className={primaryButton}
        >
          <Plus className="h-4 w-4" />
          New window
        </button>
      </div>

      {windows.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No extended credit windows yet.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {windows.map((creditWindow) => {
            const rowKey = `window:${creditWindow.id}`;
            return (
              <li
                key={creditWindow.id}
                className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {creditWindow.name}
                    </span>
                    <PromoStatusBadge status={creditWindow.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formatPromoWindow(creditWindow)} · up to{" "}
                    {creditWindow.maxMonths} months ·{" "}
                    {plural(creditWindow.requestCount, "request")}
                    {creditWindow.promoName &&
                      ` · promo: ${creditWindow.promoName}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(creditWindow)}
                    disabled={disabled}
                    className={outlineButton}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      save(rowKey, "PATCH", {
                        type: "window",
                        key: creditWindow.id,
                        is_active: !creditWindow.isActive,
                      })
                    }
                    disabled={disabled}
                    aria-pressed={creditWindow.isActive}
                    className={activeToggleClass(creditWindow.isActive)}
                    title={
                      creditWindow.isActive
                        ? "Click to deactivate - stops it immediately"
                        : "Click to activate"
                    }
                  >
                    {busyKey === rowKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : creditWindow.isActive ? (
                      "Active"
                    ) : (
                      "Inactive"
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
