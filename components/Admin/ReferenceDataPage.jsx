"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Database,
  Loader2,
  Plus,
  Save,
} from "lucide-react";
import Alert from "../Alert";
import ReferenceDataSkeleton from "../skeletons/ReferenceDataSkeleton";
import CreditPeriodsSection from "./CreditPeriods/CreditPeriodsSection";
import {
  fetchReferenceData,
  saveReferenceData,
} from "@/utils/FetchAdmin/fetchAdmin";
import {
  DEPARTMENT_NAME_MAX_LENGTH,
  LOCATION_LABEL_MAX_LENGTH,
} from "@/utils/Admin/adminConstants";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm focus:border-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white";
const buttonClass =
  "inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40";
const primaryButton = `${buttonClass} bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300`;
const ghostButton = `${buttonClass} text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800`;
const sectionClass =
  "rounded-xl border border-gray-200 p-4 dark:border-gray-800";

// Admin-managed dropdown data + settings
// (PATCH/POST /api/admin/reference-data). Entries are deactivated, never
// deleted - existing requests and users keep their stored values.
export default function ReferenceDataPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminReferenceData"],
    queryFn: fetchReferenceData,
  });
  const [busyKey, setBusyKey] = useState(null);
  const [alertInfo, setAlertInfo] = useState({
    show: false,
    type: "",
    message: "",
  });

  // Every change returns the full, fresh lists; the dropdown caches used by
  // the forms ("referenceData" queries) are refreshed too.
  const save = async (busy, method, body) => {
    setBusyKey(busy);
    try {
      const result = await saveReferenceData(method, body);
      queryClient.setQueryData(["adminReferenceData"], result);
      queryClient.invalidateQueries({ queryKey: ["referenceData"] });
      queryClient.invalidateQueries({ queryKey: ["adminAuditLog"] });
      setAlertInfo({ show: true, type: "success", message: result.message });
      return true;
    } catch (error) {
      setAlertInfo({ show: true, type: "error", message: error.message });
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <>
      {alertInfo.show && (
        <Alert
          message={alertInfo.message}
          type={alertInfo.type}
          onClose={() => setAlertInfo({ show: false, type: "", message: "" })}
        />
      )}
      <div className="px-2 pb-6">
        <div className="mt-3 mb-5 px-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Database className="h-5 w-5" />
            Reference data
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Dropdown lists and settings used across the portal. Deactivate
            entries instead of deleting them - requests and users that already
            use them keep their value. Every change is in the audit log.
          </p>
        </div>

        {isLoading ? (
          <ReferenceDataSkeleton />
        ) : isError || !data ? (
          <p className="py-10 text-center text-sm text-red-500">
            Failed to load reference data. Please try refreshing the page.
          </p>
        ) : (
          <div className="space-y-6">
            <SettingsSection
              settings={data.settings}
              busyKey={busyKey}
              save={save}
            />
            <CreditPeriodsSection
              onResult={({ type, message }) =>
                setAlertInfo({ show: true, type, message })
              }
            />
            <ListSection
              type="location"
              title="Invoicing locations"
              description="Offered on the New Purchase form. The code is stored on each request and can't change; the label can."
              entries={data.locations}
              keyField="code"
              textField="label"
              maxLength={LOCATION_LABEL_MAX_LENGTH}
              busyKey={busyKey}
              save={save}
            />
            <ListSection
              type="department"
              title="Departments"
              description="Offered at registration and on the admin Users page. Renaming one also renames it for the users in it."
              entries={data.departments}
              keyField="id"
              textField="name"
              maxLength={DEPARTMENT_NAME_MAX_LENGTH}
              busyKey={busyKey}
              save={save}
            />
          </div>
        )}
      </div>
    </>
  );
}

function SettingsSection({ settings, busyKey, save }) {
  return (
    <section className={sectionClass}>
      <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
        Settings
      </h3>
      <div className="space-y-3">
        {settings.map((setting) => (
          <SettingRow
            key={setting.key}
            setting={setting}
            busy={busyKey === `setting:${setting.key}`}
            disabled={busyKey !== null}
            save={save}
          />
        ))}
      </div>
    </section>
  );
}

// Input and Save share h-10 so the button lines up with the field beside it.
function SettingRow({ setting, busy, disabled, save }) {
  const [value, setValue] = useState(setting.value);
  const changed = value.trim() !== setting.value;

  return (
    <form
      className="flex flex-col gap-2 md:flex-row md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        save(`setting:${setting.key}`, "PATCH", {
          type: "setting",
          key: setting.key,
          value,
        });
      }}
    >
      <div className="md:w-72">
        <label
          htmlFor={`setting-${setting.key}`}
          className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
        >
          {setting.label}
        </label>
        <input
          id={`setting-${setting.key}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          className={`${inputClass} h-10`}
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !changed}
        className={`${primaryButton} h-10`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save
      </button>
      <p className="text-xs text-gray-500 md:pb-2 dark:text-gray-400">
        {setting.description}
      </p>
    </form>
  );
}

function ListSection({
  type,
  title,
  description,
  entries,
  keyField,
  textField,
  maxLength,
  busyKey,
  save,
}) {
  const [newCode, setNewCode] = useState("");
  const [newText, setNewText] = useState("");
  const addBusyKey = `${type}:new`;
  const isLocation = type === "location";

  const handleAdd = async (e) => {
    e.preventDefault();
    const ok = await save(addBusyKey, "POST", {
      type,
      [textField]: newText,
      ...(isLocation ? { code: newCode } : {}),
    });
    if (ok) {
      setNewCode("");
      setNewText("");
    }
  };

  return (
    <section className={sectionClass}>
      <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {entries.map((entry, index) => (
          <ListRow
            key={entry[keyField]}
            type={type}
            entry={entry}
            keyField={keyField}
            textField={textField}
            maxLength={maxLength}
            isFirst={index === 0}
            isLast={index === entries.length - 1}
            busyKey={busyKey}
            save={save}
          />
        ))}
      </ul>

      <form
        onSubmit={handleAdd}
        className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-4 md:flex-row dark:border-gray-800"
      >
        {isLocation && (
          <input
            aria-label="New location code"
            placeholder="CODE"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            maxLength={32}
            disabled={busyKey !== null}
            className={`${inputClass} font-mono md:w-40`}
          />
        )}
        <input
          aria-label={isLocation ? "New location label" : "New department name"}
          placeholder={isLocation ? "Label shown to staff" : "Department name"}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          maxLength={maxLength}
          disabled={busyKey !== null}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={
            busyKey !== null || !newText.trim() || (isLocation && !newCode)
          }
          className={primaryButton}
        >
          {busyKey === addBusyKey ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </button>
      </form>
    </section>
  );
}

function ListRow({
  type,
  entry,
  keyField,
  textField,
  maxLength,
  isFirst,
  isLast,
  busyKey,
  save,
}) {
  const [text, setText] = useState(entry[textField]);
  const rowKey = `${type}:${entry[keyField]}`;
  const disabled = busyKey !== null;
  const changed = text.trim() !== entry[textField];
  const patch = (body) =>
    save(rowKey, "PATCH", { type, key: entry[keyField], ...body });

  return (
    <li className="flex flex-col gap-2 py-2 md:flex-row md:items-center">
      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Move up"
          aria-label="Move up"
          onClick={() => patch({ move: "up" })}
          disabled={disabled || isFirst}
          className={ghostButton}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Move down"
          aria-label="Move down"
          onClick={() => patch({ move: "down" })}
          disabled={disabled || isLast}
          className={ghostButton}
        >
          <ArrowDown className="h-4 w-4" />
        </button>
        {type === "location" && (
          <span className="w-24 truncate font-mono text-xs text-gray-500 dark:text-gray-400">
            {entry.code}
          </span>
        )}
      </div>
      <input
        aria-label={`${type === "location" ? "Label" : "Name"} for ${entry[textField]}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={maxLength}
        disabled={disabled}
        className={`${inputClass} ${entry.is_active ? "" : "text-gray-400 dark:text-gray-500"}`}
      />
      <div className="flex items-center gap-2">
        {type === "department" && (
          <span className="text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
            {entry.userCount} user{entry.userCount === 1 ? "" : "s"}
          </span>
        )}
        {changed && (
          <button
            type="button"
            onClick={() => patch({ [textField]: text })}
            disabled={disabled}
            className={primaryButton}
          >
            {busyKey === rowKey ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
        )}
        <button
          type="button"
          onClick={() => patch({ is_active: !entry.is_active })}
          disabled={disabled}
          aria-pressed={entry.is_active}
          className={`${buttonClass} w-24 border ${
            entry.is_active
              ? "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-950"
              : "border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
          title={entry.is_active ? "Click to deactivate" : "Click to activate"}
        >
          {entry.is_active ? "Active" : "Inactive"}
        </button>
      </div>
    </li>
  );
}
