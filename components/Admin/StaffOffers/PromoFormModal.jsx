"use client";
import { useId, useState } from "react";
import { Copy, Loader2, Plus, X } from "lucide-react";
import Modal from "../../Reusables/Modal/Modal";
import { usePromoSave } from "./usePromoSave";
import {
  hintClass,
  inputClass,
  labelClass,
  plural,
  primaryButton,
} from "./staffOfferUi";
import {
  PROMO_NAME_MAX_LENGTH,
  REASON_MAX_LENGTH,
} from "@/utils/Admin/adminConstants";

// New promo, or a duplicate of `source` (its active products are copied at
// their prices into the new promo). `editing` = { source, key }: the key
// changes on every open so the form resets.
export default function PromoFormModal({ open, editing, onClose, onCreated }) {
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      mobile="fullscreen"
      className="overflow-y-auto border-gray-200 bg-gray-50 p-6 shadow-2xl md:max-h-[90vh] md:max-w-xl md:border dark:border-gray-700 dark:bg-gray-950"
    >
      {editing && (
        <PromoForm
          key={editing.key}
          source={editing.source}
          titleId={titleId}
          onClose={onClose}
          onCreated={onCreated}
        />
      )}
    </Modal>
  );
}

function PromoForm({ source, titleId, onClose, onCreated }) {
  const { save, busy, error, overlapDialog } = usePromoSave();
  const [form, setForm] = useState({
    name: source ? `${source.name} (copy)`.slice(0, PROMO_NAME_MAX_LENGTH) : "",
    // A promo's end is inclusive to the minute, so a whole last day ends 23:59
    startsAt: "",
    endsAt: "",
    reason: "",
  });
  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    save(
      "create",
      "POST",
      "",
      { ...form, ...(source ? { copyFromId: source.id } : {}) },
      (result) => onCreated(result.promo, result.message),
    );
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3
            id={titleId}
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            {source ? "Duplicate promo" : "New promo"}
          </h3>
          {source && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Copies {plural(source.activeProductCount, "active product")} from{" "}
              {source.name} at their prices.
            </p>
          )}
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

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="promo-name" className={labelClass}>
            Promo name
          </label>
          <input
            id="promo-name"
            required
            maxLength={PROMO_NAME_MAX_LENGTH}
            value={form.name}
            disabled={busy}
            onChange={set("name")}
            placeholder="e.g. December 2026 Staff Promo"
            className={inputClass}
          />
          <p className={hintClass}>Must be unique.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="promo-starts" className={labelClass}>
              Starts
            </label>
            <input
              id="promo-starts"
              type="datetime-local"
              required
              value={form.startsAt}
              disabled={busy}
              onChange={set("startsAt")}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="promo-ends" className={labelClass}>
              Ends
            </label>
            <input
              id="promo-ends"
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
        <div>
          <label htmlFor="promo-reason" className={labelClass}>
            Reason{" "}
            <span className="font-normal text-gray-500">
              (optional, recorded in the audit log)
            </span>
          </label>
          <input
            id="promo-reason"
            maxLength={REASON_MAX_LENGTH}
            value={form.reason}
            disabled={busy}
            onChange={set("reason")}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 md:flex-row md:items-center md:justify-between dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {source
              ? "The original promo isn't changed."
              : "Add products on the promo's page once it's created."}
          </p>
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : source ? (
              <Copy className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {source ? "Create copy" : "Create promo"}
          </button>
        </div>
      </form>
      {overlapDialog}
    </>
  );
}
