"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Plus, Search, X } from "lucide-react";
import StickyPageHeader from "../../Reusables/StickyPageHeader";
import AccessSkeleton from "../../skeletons/AccessSkeleton";
import ConfirmationDialog from "../../Reusables/ConfirmationDialog";
import { triggerAlert } from "@/store/useAlertStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  fetchAdminAccess,
  fetchAdminUsers,
  runAdminUserAction,
} from "@/utils/FetchAdmin/fetchAdmin";
import { ROLE_LABELS } from "@/utils/Admin/adminConstants";
import { formatDateLong } from "@/utils/formatDateLong";

const cardClass =
  "rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white py-2 pr-2 pl-8 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white";
const smallButton =
  "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";

// Who holds each access area (utils/permissions.js). Grants and removals go
// through the same audited user action as the Users modal.
export default function AdminAccessPage() {
  const queryClient = useQueryClient();
  const [busyKey, setBusyKey] = useState(null);
  const [pendingRevoke, setPendingRevoke] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminAccess"],
    queryFn: fetchAdminAccess,
  });

  const run = async (userId, action, permission) => {
    setBusyKey(`${action}:${userId}:${permission}`);
    try {
      const result = await runAdminUserAction(userId, { action, permission });
      triggerAlert("success", result.message);
      return true;
    } catch (error) {
      triggerAlert("error", error.message);
      return false;
    } finally {
      setBusyKey(null);
      queryClient.invalidateQueries({ queryKey: ["adminAccess"] });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminAuditLog"] });
    }
  };

  return (
    <div className="px-2 pb-6">
      <StickyPageHeader className="px-1 py-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <KeyRound className="h-5 w-5" />
          Access
        </h2>
      </StickyPageHeader>
      <p className="mb-5 px-1 text-sm text-gray-500 dark:text-gray-400">
        Extra areas you can open to individual users on top of their role.
        Admins have every area automatically. Access is kept when a user&apos;s
        role changes and removed when the account is deactivated. Every change
        is in the audit log.
      </p>

      {isLoading ? (
        <AccessSkeleton />
      ) : isError || !data ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Failed to load access. Please try refreshing the page.
        </p>
      ) : (
        <div className="space-y-4">
          {data.permissions.map((permission) => (
            <PermissionCard
              key={permission.key}
              permission={permission}
              activeAdmins={data.activeAdmins}
              busyKey={busyKey}
              onGrant={(user) =>
                run(user.id, "grant_permission", permission.key)
              }
              onRevoke={(holder) =>
                setPendingRevoke({ holder, permission })
              }
            />
          ))}
        </div>
      )}

      <ConfirmationDialog
        showDialog={pendingRevoke !== null}
        title="Remove access"
        message={
          pendingRevoke &&
          `Remove ${pendingRevoke.permission.label} access from ${pendingRevoke.holder.name}? They lose it on their next request.`
        }
        onConfirm={async () => {
          await run(
            pendingRevoke.holder.id,
            "revoke_permission",
            pendingRevoke.permission.key,
          );
          setPendingRevoke(null);
        }}
        onCancel={() => setPendingRevoke(null)}
        busy={busyKey?.startsWith("revoke_permission") ?? false}
        busyLabel="Removing..."
      />
    </div>
  );
}

function PermissionCard({
  permission,
  activeAdmins,
  busyKey,
  onGrant,
  onRevoke,
}) {
  const { holders } = permission;
  return (
    <section className={cardClass} aria-labelledby={`perm-${permission.key}`}>
      <h3
        id={`perm-${permission.key}`}
        className="font-semibold text-gray-900 dark:text-white"
      >
        {permission.label}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {permission.description}
      </p>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {holders.length} user{holders.length === 1 ? "" : "s"} granted, plus{" "}
        {activeAdmins} active admin{activeAdmins === 1 ? "" : "s"}.
      </p>

      <AddHolder
        permission={permission}
        busyKey={busyKey}
        onGrant={onGrant}
      />

      {holders.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-3 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nobody besides the admins has this yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {holders.map((holder) => (
            <li
              key={holder.id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                {/* Only the name truncates: pills inside an overflow-hidden
                    line would have their vertical padding clipped */}
                <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <span className="truncate">{holder.name}</span>
                  <span className="shrink-0 rounded-[9px] border border-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                    {ROLE_LABELS[holder.role] ?? holder.role}
                  </span>
                  {!holder.is_active && (
                    <span className="shrink-0 rounded-[9px] bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
                      Deactivated
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {holder.email}
                  {holder.department ? ` · ${holder.department}` : ""}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Granted {formatDateLong(holder.granted_at)}
                  {holder.granted_by_name ? ` by ${holder.granted_by_name}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRevoke(holder)}
                disabled={busyKey !== null}
                className={`${smallButton} self-start text-red-700 hover:bg-red-50 sm:self-center dark:text-red-400 dark:hover:bg-red-950`}
              >
                <X className="h-4 w-4" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Search active non-admin users and grant them this permission
function AddHolder({ permission, busyKey, onGrant }) {
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim(), 300);
  const holderIds = new Set(permission.holders.map((h) => h.id));

  const { data, isFetching } = useQuery({
    queryKey: ["adminUsers", "accessSearch", term],
    queryFn: () =>
      fetchAdminUsers({ search: term, status: "active", pageSize: 8 }),
    enabled: term.length >= 2,
  });

  const results = (data?.data ?? []).filter(
    (user) => user.role !== "admin" && !holderIds.has(user.id),
  );
  const inputId = `perm-search-${permission.key}`;

  return (
    <div className="mt-4">
      <label
        htmlFor={inputId}
        className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
      >
        Grant to a user
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
        />
        <input
          id={inputId}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or payroll no..."
          autoComplete="off"
          className={inputClass}
        />
        {isFetching && (
          <Loader2 className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {term.length >= 2 && data && (
        <ul className="small-scrollbar mt-2 max-h-64 divide-y divide-gray-200 overflow-y-auto rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {results.length === 0 ? (
            <li className="p-3 text-sm text-gray-500 dark:text-gray-400">
              No active users without this access match &ldquo;{term}&rdquo;.
            </li>
          ) : (
            results.map((user) => {
              const busy =
                busyKey === `grant_permission:${user.id}:${permission.key}`;
              return (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-2 p-2 pl-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {ROLE_LABELS[user.role] ?? user.role} · {user.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (await onGrant(user)) setSearch("");
                    }}
                    disabled={busyKey !== null}
                    className={`${smallButton} bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300`}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Grant
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
