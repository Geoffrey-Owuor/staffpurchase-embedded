"use client";
import { useId, useState } from "react";
import { Loader2, X } from "lucide-react";
import Modal from "../../Reusables/Modal/Modal";
import { usePromoSave } from "./usePromoSave";
import {
  dangerButton,
  hintClass,
  inputClass,
  labelClass,
  primaryButton,
} from "./staffOfferUi";
import {
  PROMO_EXTEND_GRACE_DAYS,
  PROMO_NAME_MAX_LENGTH,
  REASON_MAX_LENGTH,
} from "@/utils/Admin/adminConstants";

const TITLES = {
  rename: "Rename promo",
  update_window: "Change period",
  deactivate: "Deactivate promo",
  reactivate: "Reactivate promo",
};

// One promo action (PATCH api/admin/staff-offers/[id]). `editing` =
// { action, key } - the key resets the form on every open.
export default function PromoActionModal({
  open,
  editing,
  promo,
  onClose,
  onDone,
}) {
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="overflow-y-auto border-gray-200 bg-gray-50 p-6 shadow-2xl md:max-h-[90vh] md:max-w-lg md:border dark:border-gray-700 dark:bg-gray-950"
    >
      {editing && promo && (
        <PromoActionForm
          key={editing.key}
          action={editing.action}
          promo={promo}
          titleId={titleId}
          onClose={onClose}
          onDone={onDone}
        />
      )}
    </Modal>
  );
}

// What the period form allows, by where the promo is in time
function periodHelp(promo) {
  if (promo.phase === "upcoming") {
    return "It hasn't started yet, so both dates can change.";
  }
  if (promo.phase === "running") {
    return "It has started, so the start is fixed. The end can move later, or earlier but not before now - to stop it now, deactivate it.";
  }
  return `It has ended, but within the last ${PROMO_EXTEND_GRACE_DAYS} days, so it can still be extended.`;
}

function PromoActionForm({ action, promo, titleId, onClose, onDone }) {
  const { save, busy, error, overlapDialog } = usePromoSave();
  const [name, setName] = useState(promo.name);
  const [startsAt, setStartsAt] = useState(promo.startsAt);
  const [endsAt, setEndsAt] = useState(promo.endsAt);
  const [reason, setReason] = useState("");
  const reasonRequired = action !== "rename";

  const handleSubmit = (e) => {
    e.preventDefault();
    save(
      action,
      "PATCH",
      `/${promo.id}`,
      {
        action,
        reason,
        ...(action === "rename" ? { name } : {}),
        ...(action === "update_window" ? { startsAt, endsAt } : {}),
      },
      (result) => onDone(result.message),
    );
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h3 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white">
          {TITLES[action]}
        </h3>
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

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {action === "rename" && (
          <div>
            <label htmlFor="promo-rename" className={labelClass}>
              Promo name
            </label>
            <input
              id="promo-rename"
              required
              maxLength={PROMO_NAME_MAX_LENGTH}
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
            <p className={hintClass}>
              Purchases keep the offer they used; only the label changes.
            </p>
          </div>
        )}

        {action === "update_window" && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {periodHelp(promo)}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="promo-period-start" className={labelClass}>
                  Starts
                </label>
                <input
                  id="promo-period-start"
                  type="datetime-local"
                  required
                  value={startsAt}
                  disabled={busy || promo.phase !== "upcoming"}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="promo-period-end" className={labelClass}>
                  Ends
                </label>
                <input
                  id="promo-period-end"
                  type="datetime-local"
                  required
                  min={promo.phase === "over" ? promo.endsAt : startsAt}
                  value={endsAt}
                  disabled={busy}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className={inputClass}
                />
                <p className={hintClass}>Inclusive, to the minute.</p>
              </div>
            </div>
          </>
        )}

        {action === "deactivate" && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Its offers stop applying to new requests straight away. Requests
            already submitted keep their price. You can reactivate it while its
            period hasn&apos;t ended.
          </p>
        )}

        {action === "reactivate" && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Its active products apply again for the rest of its period.
          </p>
        )}

        <div>
          <label htmlFor="promo-action-reason" className={labelClass}>
            Reason{" "}
            <span className="font-normal text-gray-500">
              ({reasonRequired ? "required" : "optional"}, recorded in the audit
              log)
            </span>
          </label>
          <input
            id="promo-action-reason"
            required={reasonRequired}
            maxLength={REASON_MAX_LENGTH}
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-800">
          <button
            type="submit"
            disabled={busy}
            className={action === "deactivate" ? dangerButton : primaryButton}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {TITLES[action].replace(" promo", "")}
          </button>
        </div>
      </form>
      {overlapDialog}
    </>
  );
}
