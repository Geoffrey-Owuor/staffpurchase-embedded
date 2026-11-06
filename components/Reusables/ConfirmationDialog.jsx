"use client";

import { useId } from "react";
import { Check, Loader2, X } from "lucide-react";
import Modal from "./Modal/Modal";
import ModalHeader from "@/components/Reusables/Modal/ModalHeader";

// While `busy` (the confirmed request is in flight) the dialog stays open with
// a spinner on Proceed and can't be dismissed - callers close it themselves
// once the request settles, so there's no separate full-screen loader (and no
// backdrop swap) after confirming.
const ConfirmationDialog = ({
  message,
  showDialog,
  onConfirm,
  onCancel,
  title,
  busy = false,
  busyLabel = "Processing...",
}) => {
  const titleId = useId();

  return (
    <Modal
      open={showDialog}
      onClose={onCancel}
      dismissible={!busy}
      labelledBy={titleId}
      className="border-t border-gray-200 bg-gray-50 p-4 shadow-2xl md:max-w-md md:border dark:border-gray-700 dark:bg-gray-950"
    >
      <ModalHeader
        titleId={titleId}
        title={title}
        onClose={onCancel}
        closeDisabled={busy}
        padding={4}
      />
      <p className="mb-4 text-center text-sm text-gray-700 dark:text-gray-400">
        {message}
      </p>
      <div className="flex justify-center gap-3 md:gap-4">
        <button
          onClick={onCancel}
          type="button"
          disabled={busy}
          data-autofocus
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          onClick={onConfirm}
          type="button"
          disabled={busy}
          aria-busy={busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white hover:bg-gray-700 disabled:cursor-wait disabled:hover:bg-gray-900 md:flex-none md:py-2 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 dark:disabled:hover:bg-gray-200"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {busy ? busyLabel : "Proceed"}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;
