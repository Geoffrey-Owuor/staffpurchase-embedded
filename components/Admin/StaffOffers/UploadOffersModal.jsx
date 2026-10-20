"use client";
import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CircleAlert,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Loader2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import Modal from "../../Reusables/Modal/Modal";
import ConfirmationDialog from "../../Reusables/ConfirmationDialog";
import {
  hintClass,
  inputClass,
  invalidatePromoQueries,
  labelClass,
  neutralButton,
  overlapMessage,
  plural,
  primaryButton,
} from "./staffOfferUi";
import {
  downloadAdminFile,
  uploadAdminOffers,
} from "@/utils/FetchAdmin/fetchAdmin";
import {
  OFFER_UPLOAD_RULES,
  PROMO_NAME_MAX_LENGTH,
  REASON_MAX_LENGTH,
} from "@/utils/Admin/adminConstants";

// Staff Offer products from an Excel file (api/admin/staff-offers/upload):
// into `editing.promo`, or into a new promo when it's null. Check file ->
// preview -> save; the server re-checks the file on save and saves all
// rows or none. `editing.key` resets the dialog on every open.
export default function UploadOffersModal({ open, editing, onClose, onDone }) {
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      mobile="fullscreen"
      className="overflow-y-auto border-gray-200 bg-gray-50 p-6 shadow-2xl md:max-h-[90vh] md:max-w-3xl md:border dark:border-gray-700 dark:bg-gray-950"
    >
      {editing && (
        <UploadForm
          key={editing.key}
          promo={editing.promo}
          titleId={titleId}
          onClose={onClose}
          onDone={onDone}
        />
      )}
    </Modal>
  );
}

function UploadForm({ promo, titleId, onClose, onDone }) {
  const queryClient = useQueryClient();
  const [details, setDetails] = useState({
    name: "",
    startsAt: "",
    endsAt: "",
    reason: "",
  });
  const [file, setFile] = useState(null);
  // Bumped to clear the file input after "choose another file"
  const [fileKey, setFileKey] = useState(0);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [overlapText, setOverlapText] = useState(null);

  // Any change to the inputs invalidates a preview made from the old ones
  const setDetail = (key) => (e) => {
    setDetails((prev) => ({ ...prev, [key]: e.target.value }));
    if (key !== "reason") setPreview(null);
  };

  const send = async (mode, confirmOverlap = false) => {
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    form.append("reason", details.reason);
    if (promo) {
      form.append("promoId", String(promo.id));
    } else {
      form.append("name", details.name);
      form.append("startsAt", details.startsAt);
      form.append("endsAt", details.endsAt);
    }
    if (confirmOverlap) form.append("confirmOverlap", "true");

    setBusy(mode);
    setError("");
    try {
      const result = await uploadAdminOffers(form);
      if (mode === "preview") {
        setPreview(result.preview);
      } else {
        setOverlapText(null);
        invalidatePromoQueries(queryClient);
        onDone(result.promo, result.message);
      }
    } catch (err) {
      if (err.data?.preview) setPreview(err.data.preview);
      if (err.data?.code === "overlap" && !confirmOverlap) {
        setOverlapText(overlapMessage(err.data));
      } else {
        setOverlapText(null);
        setError(err.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const downloadTemplate = async () => {
    setBusy("template");
    try {
      await downloadAdminFile(
        "/api/admin/staff-offers/template",
        "staff_offers_template.xlsx",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const chooseAnother = () => {
    setFile(null);
    setPreview(null);
    setError("");
    setFileKey((k) => k + 1);
  };

  const summary = preview?.summary;
  const canSave = summary && summary.errors === 0 && summary.valid > 0;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white">
            Upload offers from Excel
          </h3>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
            {promo ? `Adding to ${promo.name}` : "Creates a new promo with the file's products"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy !== null}
          aria-label="Close"
          className="cursor-pointer text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <details className="mt-4 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
        <summary className="cursor-pointer font-semibold text-gray-800 dark:text-gray-200">
          File format and rules
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
          {OFFER_UPLOAD_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </details>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          send("preview");
        }}
      >
        {!promo && (
          <>
            <div>
              <label htmlFor="upload-promo-name" className={labelClass}>
                Promo name
              </label>
              <input
                id="upload-promo-name"
                required
                maxLength={PROMO_NAME_MAX_LENGTH}
                value={details.name}
                disabled={busy !== null}
                onChange={setDetail("name")}
                placeholder="e.g. December 2026 Staff Promo"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="upload-promo-starts" className={labelClass}>
                  Starts
                </label>
                <input
                  id="upload-promo-starts"
                  type="datetime-local"
                  required
                  value={details.startsAt}
                  disabled={busy !== null}
                  onChange={setDetail("startsAt")}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="upload-promo-ends" className={labelClass}>
                  Ends
                </label>
                <input
                  id="upload-promo-ends"
                  type="datetime-local"
                  required
                  min={details.startsAt || undefined}
                  value={details.endsAt}
                  disabled={busy !== null}
                  onChange={setDetail("endsAt")}
                  className={inputClass}
                />
                <p className={hintClass}>Inclusive - 23:59 covers the whole last day.</p>
              </div>
            </div>
          </>
        )}

        <div>
          <label htmlFor="upload-file" className={labelClass}>
            Excel file (.xlsx)
          </label>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              key={fileKey}
              id="upload-file"
              type="file"
              required
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy !== null}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setError("");
              }}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-200 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-800 hover:file:bg-gray-300 dark:text-gray-300 dark:file:bg-gray-800 dark:file:text-gray-100"
            />
            <button
              type="button"
              onClick={downloadTemplate}
              disabled={busy !== null}
              className={neutralButton}
            >
              {busy === "template" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Template
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="upload-reason" className={labelClass}>
            Reason{" "}
            <span className="font-normal text-gray-500">
              (optional, recorded in the audit log)
            </span>
          </label>
          <input
            id="upload-reason"
            maxLength={REASON_MAX_LENGTH}
            value={details.reason}
            disabled={busy !== null}
            onChange={setDetail("reason")}
            className={inputClass}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {summary && <UploadPreview preview={preview} />}

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 md:flex-row md:justify-end dark:border-gray-800">
          {summary && (
            <button
              type="button"
              onClick={chooseAnother}
              disabled={busy !== null}
              className={neutralButton}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Choose another file
            </button>
          )}
          {canSave ? (
            <button
              type="button"
              onClick={() => send("commit")}
              disabled={busy !== null}
              className={primaryButton}
            >
              {busy === "commit" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Save {plural(summary.valid, "product")}
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy !== null || !file}
              className={primaryButton}
            >
              {busy === "preview" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileCheck2 className="h-4 w-4" />
              )}
              Check file
            </button>
          )}
        </div>
      </form>

      <ConfirmationDialog
        showDialog={overlapText !== null}
        title="Overlapping offers"
        message={overlapText}
        onConfirm={() => send("commit", true)}
        onCancel={() => setOverlapText(null)}
        busy={busy === "commit"}
        busyLabel="Saving..."
      />
    </>
  );
}

function UploadPreview({ preview }) {
  const { summary, issues } = preview;
  const hiddenIssues = summary.errors + summary.warnings - issues.length;

  return (
    <section aria-label="File check" className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-lg bg-green-50 px-2 py-1 font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
          {plural(summary.valid, "product")} ready
        </span>
        {summary.errors > 0 && (
          <span className="rounded-lg bg-red-50 px-2 py-1 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
            {plural(summary.errors, "row")} with errors
          </span>
        )}
        {summary.warnings > 0 && (
          <span className="rounded-lg bg-amber-50 px-2 py-1 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {plural(summary.warnings, "row")} with warnings
          </span>
        )}
      </div>

      {summary.errors > 0 ? (
        <p className="text-sm text-red-700 dark:text-red-300">
          Nothing can be saved until every error is fixed. Correct the file and
          choose it again.
        </p>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {summary.warnings > 0
            ? "Warnings don't block saving - check them first."
            : "Every row passed the checks."}
          {summary.overlaps > 0 &&
            " Overlapping offers need a confirmation when you save."}
        </p>
      )}

      {issues.length > 0 && (
        <div className="max-h-72 overflow-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gray-800 text-left text-white">
              <tr>
                <th className="px-3 py-2 font-semibold">Row</th>
                <th className="px-3 py-2 font-semibold">Product code</th>
                <th className="px-3 py-2 font-semibold">Problem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {issues.map((issue) => (
                <tr key={issue.row}>
                  <td className="px-3 py-2 align-top text-gray-500">{issue.row}</td>
                  <td className="px-3 py-2 align-top font-mono break-all text-gray-900 dark:text-white">
                    {issue.productCode || "-"}
                  </td>
                  <td className="space-y-1 px-3 py-2">
                    {issue.errors.map((text) => (
                      <p key={text} className="flex gap-1 text-red-700 dark:text-red-300">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        {text}
                      </p>
                    ))}
                    {issue.warnings.map((text) => (
                      <p key={text} className="flex gap-1 text-amber-700 dark:text-amber-400">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        {text}
                      </p>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hiddenIssues > 0 && (
        <p className={hintClass}>
          Showing the first {issues.length} problem rows of{" "}
          {summary.errors + summary.warnings}.
        </p>
      )}
    </section>
  );
}
