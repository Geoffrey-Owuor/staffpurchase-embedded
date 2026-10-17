"use client";
import { useId, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import Modal from "../Reusables/Modal/Modal";
import { deleteAdminPurchase } from "@/utils/FetchAdmin/fetchAdmin";
import { REASON_MAX_LENGTH } from "@/utils/Admin/adminConstants";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white";

// Admin hard delete of one request. Keep mounted and toggle `open`; the form
// lives in its own component so it resets every time the dialog opens.
// `request` needs { id, reference_number, staffName }.
export default function AdminDeleteRequestDialog({
  open,
  request,
  onClose,
  onDeleted,
}) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      labelledBy={titleId}
      className="border-t border-gray-200 bg-gray-50 p-5 shadow-2xl md:max-w-lg md:border dark:border-gray-700 dark:bg-gray-950"
    >
      {request && (
        <DeleteForm
          titleId={titleId}
          request={request}
          busy={busy}
          setBusy={setBusy}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      )}
    </Modal>
  );
}

function DeleteForm({ titleId, request, busy, setBusy, onClose, onDeleted }) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [notifyRequester, setNotifyRequester] = useState(false);
  const [error, setError] = useState("");

  const canDelete =
    reason.trim().length > 0 &&
    confirmText.trim().toUpperCase() === request.reference_number.toUpperCase();

  const handleDelete = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await deleteAdminPurchase(request.id, {
        reason: reason.trim(),
        notifyRequester,
      });
      onDeleted(result.message);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleDelete}>
      <div className="flex items-start justify-between">
        <h3
          id={titleId}
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Delete {request.reference_number}
        </h3>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
          className="rounded-full bg-gray-100 p-1.5 text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
        This permanently removes {request.staffName}&apos;s request and its
        products from every table and count. A full copy is kept in the audit
        log.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <label
        htmlFor="admin-delete-reason"
        className="mt-4 mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
      >
        Reason
      </label>
      <textarea
        id="admin-delete-reason"
        rows={2}
        required
        maxLength={REASON_MAX_LENGTH}
        value={reason}
        disabled={busy}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Duplicate of PRQ-12, submitted in error..."
        className={inputClass}
        data-autofocus
      />

      <label
        htmlFor="admin-delete-confirm"
        className="mt-3 mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
      >
        Type <span className="font-mono">{request.reference_number}</span> to
        confirm
      </label>
      <input
        id="admin-delete-confirm"
        type="text"
        autoComplete="off"
        value={confirmText}
        disabled={busy}
        onChange={(e) => setConfirmText(e.target.value)}
        className={inputClass}
      />

      <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={notifyRequester}
          disabled={busy}
          onChange={(e) => setNotifyRequester(e.target.checked)}
        />
        Email the requester that it was removed
      </label>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !canDelete}
          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {busy ? "Deleting..." : "Delete request"}
        </button>
      </div>
    </form>
  );
}
