"use client";

import { Check, X } from "lucide-react";
import ClientPortal from "./ClientPortal/ClientPortal";

const ConfirmationDialog = ({
  message,
  showDialog,
  onConfirm,
  onCancel,
  title,
}) => {
  if (!showDialog) return null;
  const content = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60`}
    >
      <div className="mx-auto max-w-90 rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-2xl md:max-w-md dark:border-gray-700 dark:bg-gray-950">
        <div className="flex items-start justify-between">
          <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onCancel}
            type="button"
            className="cursor-pointer rounded-full bg-gray-100 p-1.5 text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-center text-sm text-gray-700 dark:text-gray-400">
          {message}
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            <Check className="h-4 w-4" />
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
  return <ClientPortal>{content}</ClientPortal>;
};

export default ConfirmationDialog;
