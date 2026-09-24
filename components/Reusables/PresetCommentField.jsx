"use client";

import { useRef, useState } from "react";
import FormAsterisk from "./FormAsterisk/FormAsterisk";
import Select from "./Select";

// Approver comment field: a preset-options dropdown by default, with a toggle
// to type free text instead. Option values should be the label text itself,
// since the saved value is displayed as-is (view page, PDF, export, emails).
//
// Values that aren't one of the presets (older free-text records, or a
// previously typed custom comment) open in free-text mode so the full comment
// stays visible and editable.
export default function PresetCommentField({
  id,
  label,
  value,
  options,
  handleChange,
  readOnly = false,
  selectPlaceholder = "Select comment",
  textPlaceholder = "Enter your comments",
}) {
  const comment = value || "";
  const isPreset = (v) => options.some((o) => o.value === v);
  const [isCustom, setIsCustom] = useState(
    () => comment !== "" && !isPreset(comment),
  );
  // Remembers typed text across toggles so switching to the list and back
  // doesn't lose it.
  const customDraftRef = useRef(isCustom ? comment : "");

  const setComment = (v) => handleChange({ target: { name: id, value: v } });

  const toggleMode = () => {
    if (isCustom) {
      customDraftRef.current = comment;
      if (!isPreset(comment)) setComment("");
    } else if (customDraftRef.current) {
      setComment(customDraftRef.current);
    }
    setIsCustom(!isCustom);
  };

  return (
    <>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-gray-700 dark:text-gray-400"
        >
          {label} <FormAsterisk />
        </label>
        {!readOnly && (
          <button
            type="button"
            onClick={toggleMode}
            className="cursor-pointer text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
          >
            {isCustom ? "Choose from list" : "Type my own comment"}
          </button>
        )}
      </div>
      {isCustom ? (
        <textarea
          id={id}
          name={id}
          rows={4}
          value={comment}
          onChange={(e) => {
            customDraftRef.current = e.target.value;
            handleChange(e);
          }}
          readOnly={readOnly}
          className={`w-full rounded-xl border border-gray-300 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${readOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
          placeholder={textPlaceholder}
          required
        />
      ) : (
        <Select
          id={id}
          name={id}
          value={comment}
          onChange={setComment}
          options={options}
          placeholder={selectPlaceholder}
          className="w-full"
          disabled={readOnly}
          required
        />
      )}
    </>
  );
}
