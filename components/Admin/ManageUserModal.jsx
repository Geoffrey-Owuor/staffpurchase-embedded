"use client";
import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Loader2,
  LockOpen,
  Save,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import Modal from "../Reusables/Modal/Modal";
import Select from "../Reusables/Select";
import ConfirmationDialog from "../Reusables/ConfirmationDialog";
import UserStatusBadge, { getUserStatus } from "./UserStatusBadge";
import { useUser } from "@/context/UserContext";
import { runAdminUserAction } from "@/utils/FetchAdmin/fetchAdmin";
import {
  ROLE_LABELS,
  ROLE_OPTIONS,
  REASON_MAX_LENGTH,
  PROFILE_FIELD_MAX_LENGTH,
} from "@/utils/Admin/adminConstants";
import { formatDateLong } from "@/public/assets";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800";
const labelClass =
  "mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400";
const sectionClass =
  "rounded-xl border border-gray-200 p-4 dark:border-gray-800";
const buttonClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const neutralButton = `${buttonClass} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800`;
const primaryButton = `${buttonClass} bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300`;
const dangerButton = `${buttonClass} bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600`;

// Actions that need a reason (enforced server-side too - see
// app/api/admin/users/[id]/route.js) and that are confirmed first.
const REASON_REQUIRED = ["change_role", "deactivate", "reactivate"];
const CONFIRMED = ["change_role", "deactivate"];

export default function ManageUserModal({ open, user, onClose, onResult }) {
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      mobile="fullscreen"
      className="overflow-y-auto border-gray-200 bg-gray-50 p-6 shadow-2xl md:max-h-[90vh] md:max-w-2xl md:border dark:border-gray-700 dark:bg-gray-950"
    >
      {user && (
        <ManageUserContent
          initialUser={user}
          titleId={titleId}
          onClose={onClose}
          onResult={onResult}
        />
      )}
    </Modal>
  );
}

// Per-open state lives here so it resets every time the modal opens.
function ManageUserContent({ initialUser, titleId, onClose, onResult }) {
  const queryClient = useQueryClient();
  const { id: currentAdminId } = useUser();
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState({
    name: initialUser.name ?? "",
    payrollNo: initialUser.payrollNo ?? "",
    department: initialUser.department ?? "",
  });
  const [role, setRole] = useState(initialUser.role);
  const [reason, setReason] = useState("");
  const [busyAction, setBusyAction] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const isSelf = user.id === currentAdminId;
  const status = getUserStatus(user);
  const hasReason = reason.trim().length > 0;
  const profileChanged =
    profile.name.trim() !== (user.name ?? "") ||
    profile.payrollNo.trim() !== (user.payrollNo ?? "") ||
    profile.department.trim() !== (user.department ?? "");

  const run = async (action, extra = {}) => {
    setBusyAction(action);
    setError("");
    setWarning("");
    try {
      const result = await runAdminUserAction(user.id, {
        action,
        reason: reason.trim(),
        ...extra,
      });
      setUser(result.user);
      setProfile({
        name: result.user.name ?? "",
        payrollNo: result.user.payrollNo ?? "",
        department: result.user.department ?? "",
      });
      setRole(result.user.role);
      setReason("");
      if (result.warning) setWarning(result.warning);
      onResult("success", result.message);
    } catch (err) {
      if (err.user) setUser(err.user);
      setError(err.message);
    } finally {
      setBusyAction(null);
      setPendingConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminAuditLog"] });
    }
  };

  // Deactivation and role changes are confirmed first; the dialog stays open
  // (busy) until the request settles.
  const request = (action, extra = {}) => {
    if (CONFIRMED.includes(action)) {
      const message =
        action === "deactivate"
          ? `Deactivate ${user.name}? They'll be signed out everywhere and can't sign in until reactivated.`
          : `Change ${user.name}'s role from ${ROLE_LABELS[user.role]} to ${ROLE_LABELS[extra.role]}? They'll be signed out and see the ${ROLE_LABELS[extra.role]} view on their next sign-in.`;
      setPendingConfirm({ action, extra, message });
      return;
    }
    run(action, extra);
  };

  const busy = busyAction !== null;
  const needsReason = (action) =>
    REASON_REQUIRED.includes(action) && !hasReason;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3
            id={titleId}
            className="truncate text-xl font-bold text-gray-900 dark:text-white"
          >
            {user.name}
          </h3>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
            {user.email}
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

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <UserStatusBadge user={user} />
        <span className="rounded-[9px] border border-gray-200 px-2 py-1 font-semibold dark:border-gray-700">
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
        <span>
          {user.requestCount} request{user.requestCount === 1 ? "" : "s"}
        </span>
        <span>· Registered {formatDateLong(user.created_at)}</span>
      </div>

      {isSelf && (
        <p className="mt-4 rounded-lg bg-blue-50 p-2 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          This is your own account - its role and active status can't be changed
          here. Ask another admin if that's needed.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {warning && (
        <p className="mt-4 rounded-lg bg-amber-100 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {warning}
        </p>
      )}

      <div className="mt-5 space-y-4">
        {/* Profile */}
        <form
          className={sectionClass}
          onSubmit={(e) => {
            e.preventDefault();
            request("update_profile", {
              name: profile.name,
              payrollNo: profile.payrollNo,
              department: profile.department,
            });
          }}
        >
          <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
            Profile
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ["name", "Name"],
              ["payrollNo", "Payroll No"],
              ["department", "Department"],
            ].map(([key, label]) => (
              <div key={key}>
                <label htmlFor={`admin-user-${key}`} className={labelClass}>
                  {label}
                </label>
                <input
                  id={`admin-user-${key}`}
                  type="text"
                  required
                  maxLength={PROFILE_FIELD_MAX_LENGTH}
                  value={profile[key]}
                  disabled={busy}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Saving signs the user out so their details refresh. Existing
              requests keep the details they were submitted with.
            </p>
            <button
              type="submit"
              disabled={busy || !profileChanged}
              className={primaryButton}
            >
              {busyAction === "update_profile" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save profile
            </button>
          </div>
        </form>

        {/* Reason - shared by the role/access actions below */}
        <div className={sectionClass}>
          <label htmlFor="admin-user-reason" className={labelClass}>
            Reason{" "}
            <span className="font-normal text-gray-500">
              (recorded in the audit log)
            </span>
          </label>
          <textarea
            id="admin-user-reason"
            rows={2}
            maxLength={REASON_MAX_LENGTH}
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Moved to Credit Control, left the company, locked out after a typo..."
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Required to change the role, deactivate or reactivate. Optional for
            the other actions.
          </p>
        </div>

        {/* Role */}
        <div className={sectionClass}>
          <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
            Role
          </h4>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Select
              id="admin-user-role"
              className="md:w-64"
              value={role}
              onChange={setRole}
              options={ROLE_OPTIONS}
              disabled={busy || isSelf}
            />
            <button
              type="button"
              onClick={() => request("change_role", { role })}
              disabled={
                busy ||
                isSelf ||
                role === user.role ||
                needsReason("change_role")
              }
              className={primaryButton}
            >
              <ShieldCheck className="h-4 w-4" />
              Change role
            </button>
          </div>
          {role !== user.role && !hasReason && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Add a reason above to change the role.
            </p>
          )}
        </div>

        {/* Access */}
        <div className={sectionClass}>
          <h4 className="mb-1 font-semibold text-gray-900 dark:text-white">
            Account access
          </h4>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {status === "deactivated"
              ? "Deactivated by an admin - the user can't sign in until reactivated."
              : status === "locked"
                ? "Locked after too many failed sign-ins. Unlock it, or send a reset link (which also unlocks it)."
                : "The user can sign in normally."}
          </p>
          <div className="flex flex-wrap gap-2">
            {status === "locked" && (
              <button
                type="button"
                onClick={() => request("unlock")}
                disabled={busy}
                className={neutralButton}
              >
                {busyAction === "unlock" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LockOpen className="h-4 w-4" />
                )}
                Unlock
              </button>
            )}
            <button
              type="button"
              onClick={() => request("send_reset")}
              disabled={busy}
              className={neutralButton}
              title="Unlocks the account and emails a 1-hour password reset link"
            >
              {busyAction === "send_reset" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Send reset link
            </button>
            {user.is_active ? (
              <button
                type="button"
                onClick={() => request("deactivate")}
                disabled={busy || isSelf || needsReason("deactivate")}
                className={dangerButton}
              >
                <UserX className="h-4 w-4" />
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => request("reactivate")}
                disabled={busy || needsReason("reactivate")}
                className={primaryButton}
              >
                {busyAction === "reactivate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Reactivate
              </button>
            )}
          </div>
          {!isSelf && !hasReason && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {user.is_active ? "Deactivating" : "Reactivating"} needs a reason
              above.
            </p>
          )}
        </div>
      </div>

      <ConfirmationDialog
        showDialog={pendingConfirm !== null}
        title={
          pendingConfirm?.action === "deactivate"
            ? "Deactivate account"
            : "Change role"
        }
        message={pendingConfirm?.message}
        onConfirm={() => run(pendingConfirm.action, pendingConfirm.extra)}
        onCancel={() => setPendingConfirm(null)}
        busy={busy}
        busyLabel={
          pendingConfirm?.action === "deactivate"
            ? "Deactivating..."
            : "Changing..."
        }
      />
    </>
  );
}
