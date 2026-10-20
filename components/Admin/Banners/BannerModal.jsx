"use client";
import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../../Reusables/Modal/Modal";
import Select from "../../Reusables/Select";
import ConfirmationDialog from "../../Reusables/ConfirmationDialog";
import BannerCard from "../../Banners/BannerCard";
import BannerStatusBadge from "./BannerStatusBadge";
import { formatAudience, formatBannerTime } from "./bannerFormat";
import { saveAdminBanner } from "@/utils/FetchAdmin/fetchAdmin";
import {
  BANNER_MESSAGE_MAX_LENGTH,
  BANNER_PRIORITY_RANGE,
  BANNER_SEVERITY_OPTIONS,
  REASON_MAX_LENGTH,
  ROLE_OPTIONS,
} from "@/utils/Admin/adminConstants";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:scheme-dark dark:disabled:bg-gray-800";
const labelClass =
  "mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400";
const hintClass = "mt-1 text-xs text-gray-500 dark:text-gray-400";
const buttonClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const neutralButton = `${buttonClass} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800`;
const primaryButton = `${buttonClass} bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300`;
const dangerButton = `${buttonClass} border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950`;

const toForm = (banner, mode) => ({
  message: banner?.message ?? "",
  severity: banner?.severity ?? "info",
  targetRoles: banner?.targetRoles ?? [],
  // A duplicate gets a fresh window - the original's has usually passed
  startsAt: mode === "edit" ? (banner?.startsAt ?? "") : "",
  endsAt: mode === "edit" ? (banner?.endsAt ?? "") : "",
  priority: String(banner?.priority ?? 0),
  isActive: true,
});

// Create/edit one dashboard banner. `editing` = { mode, banner, key }: the
// key changes on every open (and on Duplicate), so the form resets.
export default function BannerModal({
  open,
  editing,
  onClose,
  onDuplicate,
  onResult,
}) {
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      mobile="fullscreen"
      className="overflow-y-auto border-gray-200 bg-gray-50 p-6 shadow-2xl md:max-h-[90vh] md:max-w-2xl md:border dark:border-gray-700 dark:bg-gray-950"
    >
      {editing && (
        <BannerContent
          key={editing.key}
          mode={editing.mode}
          banner={editing.banner}
          titleId={titleId}
          onClose={onClose}
          onDuplicate={onDuplicate}
          onResult={onResult}
        />
      )}
    </Modal>
  );
}

function BannerContent({
  mode,
  banner: initialBanner,
  titleId,
  onClose,
  onDuplicate,
  onResult,
}) {
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";
  const [banner, setBanner] = useState(isEdit ? initialBanner : null);
  const [form, setForm] = useState(() => toForm(initialBanner, mode));
  const [reason, setReason] = useState("");
  const [reshow, setReshow] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const busy = busyAction !== null;
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  const everyone = form.targetRoles.length === 0;

  const toggleRole = (role) =>
    set("targetRoles")(
      form.targetRoles.includes(role)
        ? form.targetRoles.filter((r) => r !== role)
        : [...form.targetRoles, role],
    );

  const formBody = () => ({
    message: form.message,
    severity: form.severity,
    targetRoles: form.targetRoles,
    startsAt: form.startsAt || null,
    endsAt: form.endsAt || null,
    priority: Number(form.priority),
  });

  const contentChanged =
    isEdit &&
    (form.message.trim() !== banner.message ||
      form.severity !== banner.severity);

  const run = async (action, method, body, { close = false } = {}) => {
    setBusyAction(action);
    setError("");
    try {
      const result = await saveAdminBanner(method, banner?.id, {
        ...body,
        reason: reason.trim(),
      });
      onResult("success", result.message);
      if (close) {
        onClose();
      } else if (result.banner) {
        setBanner(result.banner);
        setReason("");
        // A quick (de)activate leaves any unsaved form edits alone
        if (action !== "toggle") {
          setForm(toForm(result.banner, "edit"));
          setReshow(false);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
      setConfirmDelete(false);
      queryClient.invalidateQueries({ queryKey: ["adminBanners"] });
      queryClient.invalidateQueries({ queryKey: ["adminAuditLog"] });
      // The admin's own dashboard banners
      queryClient.invalidateQueries({ queryKey: ["system-banners"] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      run("save", "PATCH", { ...formBody(), reshow });
    } else {
      run("create", "POST", { ...formBody(), isActive: form.isActive }, {
        close: true,
      });
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3
            id={titleId}
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            {isEdit ? `Banner #${banner.id}` : "New banner"}
          </h3>
          {isEdit && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <BannerStatusBadge status={banner.status} />
              <span>{formatAudience(banner.targetRoles)}</span>
            </div>
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
          <label htmlFor="banner-message" className={labelClass}>
            Message
          </label>
          <textarea
            id="banner-message"
            rows={3}
            required
            maxLength={BANNER_MESSAGE_MAX_LENGTH}
            value={form.message}
            disabled={busy}
            onChange={(e) => set("message")(e.target.value)}
            placeholder="e.g. Payment tracking will be unavailable on Saturday 08:00-10:00."
            className={inputClass}
          />
          <p className={hintClass}>
            Plain text; line breaks are kept. {form.message.length}/
            {BANNER_MESSAGE_MAX_LENGTH}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="banner-severity" className={labelClass}>
              Severity
            </label>
            <Select
              id="banner-severity"
              className="w-full"
              value={form.severity}
              onChange={set("severity")}
              options={BANNER_SEVERITY_OPTIONS}
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor="banner-priority" className={labelClass}>
              Priority
            </label>
            <input
              id="banner-priority"
              type="number"
              required
              step={1}
              min={BANNER_PRIORITY_RANGE.min}
              max={BANNER_PRIORITY_RANGE.max}
              value={form.priority}
              disabled={busy}
              onChange={(e) => set("priority")(e.target.value)}
              className={inputClass}
            />
            <p className={hintClass}>Higher shows first.</p>
          </div>
        </div>

        <fieldset>
          <legend className={labelClass}>Shown to</legend>
          <div className="flex flex-wrap gap-2">
            <RoleChip
              label="Everyone"
              checked={everyone}
              disabled={busy}
              onChange={() => set("targetRoles")([])}
            />
            {ROLE_OPTIONS.map((option) => (
              <RoleChip
                key={option.value}
                label={option.label}
                checked={form.targetRoles.includes(option.value)}
                disabled={busy}
                onChange={() => toggleRole(option.value)}
              />
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="banner-starts" className={labelClass}>
              Starts
            </label>
            <input
              id="banner-starts"
              type="datetime-local"
              value={form.startsAt}
              disabled={busy}
              onChange={(e) => set("startsAt")(e.target.value)}
              className={inputClass}
            />
            <p className={hintClass}>
              {isEdit ? "When it starts showing." : "Leave empty to start now."}
            </p>
          </div>
          <div>
            <label htmlFor="banner-ends" className={labelClass}>
              Ends
            </label>
            <input
              id="banner-ends"
              type="datetime-local"
              value={form.endsAt}
              min={form.startsAt || undefined}
              disabled={busy}
              onChange={(e) => set("endsAt")(e.target.value)}
              className={inputClass}
            />
            <p className={hintClass}>Leave empty to show until deactivated.</p>
          </div>
        </div>

        {!isEdit && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.isActive}
              disabled={busy}
              onChange={(e) => set("isActive")(e.target.checked)}
              className="h-4 w-4"
            />
            Active (uncheck to save it as a draft)
          </label>
        )}

        <div>
          <p className={labelClass}>Preview</p>
          {form.message.trim() ? (
            <BannerCard
              severity={form.severity}
              message={form.message.trim()}
              onDismiss={form.severity === "critical" ? undefined : () => {}}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-400 dark:border-gray-700">
              Type a message to see the banner.
            </p>
          )}
          <p className={hintClass}>
            {form.severity === "critical"
              ? "Critical banners can't be dismissed."
              : "Users can dismiss info and warning banners; changing the message or severity shows it to them again."}
          </p>
        </div>

        <div>
          <label htmlFor="banner-reason" className={labelClass}>
            Reason{" "}
            <span className="font-normal text-gray-500">
              (optional, recorded in the audit log)
            </span>
          </label>
          <input
            id="banner-reason"
            maxLength={REASON_MAX_LENGTH}
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          />
        </div>

        {isEdit && form.severity !== "critical" && !contentChanged && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={reshow}
              disabled={busy}
              onChange={(e) => setReshow(e.target.checked)}
              className="h-4 w-4"
            />
            Show it again to users who dismissed it
          </label>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 md:flex-row md:items-center md:justify-between dark:border-gray-800">
          <div className="flex flex-wrap gap-2">
            {isEdit && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run("toggle", "PATCH", { isActive: !banner.isActive })
                  }
                  className={neutralButton}
                  title={
                    banner.isActive
                      ? "Hide it now without deleting it"
                      : "Show it again (its end must still be in the future)"
                  }
                >
                  {busyAction === "toggle" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : banner.isActive ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {banner.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDuplicate(banner)}
                  className={neutralButton}
                  title="Start a new banner from this one"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                {banner.canDelete && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmDelete(true)}
                    className={dangerButton}
                    title="Only possible before it starts"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
          <button type="submit" disabled={busy} className={primaryButton}>
            {busyAction === "save" || busyAction === "create" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Save className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isEdit ? "Save changes" : "Create banner"}
          </button>
        </div>
        {isEdit && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {banner.canDelete
              ? `Starts ${formatBannerTime(banner.startsAt)} - until then it can still be deleted.`
              : "It has started, so it can't be deleted - deactivate it instead."}
          </p>
        )}
      </form>

      <ConfirmationDialog
        showDialog={confirmDelete}
        title="Delete banner"
        message="Delete this scheduled banner? Nobody has seen it yet. The audit log keeps a copy."
        onConfirm={() => run("delete", "DELETE", {}, { close: true })}
        onCancel={() => setConfirmDelete(false)}
        busy={busyAction === "delete"}
        busyLabel="Deleting..."
      />
    </>
  );
}

function RoleChip({ label, checked, disabled, onChange }) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium has-focus-visible:ring-2 has-focus-visible:ring-gray-400 ${
        checked
          ? "border-gray-900 bg-gray-900 text-white dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900"
          : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      {label}
    </label>
  );
}
