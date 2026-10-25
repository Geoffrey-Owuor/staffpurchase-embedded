"use client";
import { useId, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import Modal from "../../Reusables/Modal/Modal";
import Select from "../../Reusables/Select";
import {
  hintClass,
  inputClass,
  labelClass,
  primaryButton,
} from "../StaffOffers/staffOfferUi";
import { CREDIT_WINDOW_NAME_MAX_LENGTH } from "@/utils/Admin/adminConstants";

// New or edit an extended credit window. `editing` = { window (null =
// new), key }: the key changes on every open so the form resets. Start/end
// are DB wall-clock strings (lib/adminForm.js); `now` is the DB's.
export default function CreditWindowModal({
  open,
  editing,
  extensionPeriods,
  promos,
  now,
  busy,
  onClose,
  onSave,
}) {
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      labelledBy={titleId}
      mobile="fullscreen"
      className="overflow-y-auto border-gray-200 bg-gray-50 p-6 shadow-2xl md:max-h-[90vh] md:max-w-xl md:border dark:border-gray-700 dark:bg-gray-950"
    >
      {editing && (
        <WindowForm
          key={editing.key}
          current={editing.window}
          extensionPeriods={extensionPeriods}
          promos={promos}
          now={now}
          busy={busy}
          titleId={titleId}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Modal>
  );
}

function WindowForm({
  current,
  extensionPeriods,
  promos,
  now,
  busy,
  titleId,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() => ({
    name: current?.name ?? "",
    maxMonths:
      current?.maxMonths ?? extensionPeriods.at(-1)?.period_value ?? "",
    promoId: current?.promoId ?? "",
    startsAt: current?.startsAt ?? "",
    endsAt: current?.endsAt ?? "",
  }));
  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  // Once started, the start is fixed (the server refuses a change)
  const started = Boolean(current && current.startsAt <= now);

  // A window's max months is an active extension-only period - plus its
  // current value, should that period have been changed since
  const monthOptions = extensionPeriods.map((period) => ({
    value: period.period_value,
    label: period.period_description,
  }));
  if (
    current &&
    !monthOptions.some((option) => option.value === current.maxMonths)
  ) {
    monthOptions.push({
      value: current.maxMonths,
      label: `${current.maxMonths} months (no longer extension-only)`,
    });
  }

  const promoOptions = [
    { value: "", label: "No promo" },
    ...promos.map((promo) => ({ value: promo.id, label: promo.name })),
  ];
  if (
    current?.promoId &&
    !promos.some((promo) => promo.id === current.promoId)
  ) {
    promoOptions.push({ value: current.promoId, label: current.promoName });
  }

  // Picking a promo copies its dates (a started window keeps its start)
  const handlePromo = (promoId) => {
    const promo = promos.find((p) => p.id === promoId);
    setForm((prev) => ({
      ...prev,
      promoId,
      ...(promo
        ? {
            startsAt: started ? prev.startsAt : promo.startsAt,
            endsAt: promo.endsAt,
            name: prev.name || `${promo.name} - extended credit`,
          }
        : {}),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, promoId: form.promoId || null });
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3
            id={titleId}
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            {current
              ? "Edit extended credit window"
              : "New extended credit window"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Credit requests submitted inside the window may choose an
            extension-only period up to the max months.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="cursor-pointer text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="credit-window-promo" className={labelClass}>
            Copy dates from a promo{" "}
            <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <Select
            id="credit-window-promo"
            value={form.promoId}
            onChange={handlePromo}
            options={promoOptions}
            disabled={busy}
            className="w-full"
          />
          <p className={hintClass}>
            Fills in the promo&apos;s start and end. Later changes to the promo
            don&apos;t move this window.
          </p>
        </div>
        <div>
          <label htmlFor="credit-window-name" className={labelClass}>
            Name
          </label>
          <input
            id="credit-window-name"
            required
            maxLength={CREDIT_WINDOW_NAME_MAX_LENGTH}
            value={form.name}
            disabled={busy}
            onChange={set("name")}
            placeholder="e.g. December 2026 extended credit"
            className={inputClass}
          />
          <p className={hintClass}>
            Must be unique. Staff see it on the New Purchase form.
          </p>
        </div>
        <div>
          <label htmlFor="credit-window-months" className={labelClass}>
            Max months
          </label>
          <Select
            id="credit-window-months"
            value={form.maxMonths}
            onChange={(value) =>
              setForm((prev) => ({ ...prev, maxMonths: value }))
            }
            options={monthOptions}
            disabled={busy}
            required
            className="w-full"
          />
          <p className={hintClass}>
            Offers every extension-only period up to this one.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="credit-window-starts" className={labelClass}>
              Starts
            </label>
            <input
              id="credit-window-starts"
              type="datetime-local"
              required
              value={form.startsAt}
              disabled={busy || started}
              onChange={set("startsAt")}
              className={inputClass}
            />
            {started && (
              <p className={hintClass}>Fixed - the window has started.</p>
            )}
          </div>
          <div>
            <label htmlFor="credit-window-ends" className={labelClass}>
              Ends
            </label>
            <input
              id="credit-window-ends"
              type="datetime-local"
              required
              min={form.startsAt || undefined}
              value={form.endsAt}
              disabled={busy}
              onChange={set("endsAt")}
              className={inputClass}
            />
            <p className={hintClass}>
              Inclusive - 23:59 covers the whole last day.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 md:flex-row md:items-center md:justify-between dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            To stop a window early, deactivate it from the list.
          </p>
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {current ? "Save changes" : "Create window"}
          </button>
        </div>
      </form>
    </>
  );
}
