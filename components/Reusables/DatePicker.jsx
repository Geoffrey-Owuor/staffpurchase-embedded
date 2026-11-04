"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import Select from "./Select";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const pad = (n) => String(n).padStart(2, "0");
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: pad(i),
  label: pad(i),
}));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: pad(i),
  label: pad(i),
}));
const MONTH_OPTIONS = MONTHS.map((label, value) => ({ label, value }));

// Keep in step with the popover's w-80 class. Height is what it needs to open
// clear of the bottom edge; the time row adds to it.
const CALENDAR_WIDTH = 320;
const CALENDAR_HEIGHT = 380;
const TIME_ROW_HEIGHT = 56;
const EDGE_MARGIN = 8;

const POPOVER_ALIGN = { start: "left-0", end: "right-0" };

// Values are the same wall-clock strings the native inputs produced
// ("YYYY-MM-DD", or "YYYY-MM-DDTHH:mm" with time), never JS Dates, so nothing
// shifts with the browser's time zone. Same-format strings also compare correctly.
const toIsoDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromIsoDate = (iso) => new Date(`${iso}T00:00:00`);

// The space a popover can use before it's cut off: the viewport, narrowed by
// every ancestor that clips or scrolls (<main>, a modal)
function getClipBounds(element) {
  const root = document.documentElement;
  let left = 0;
  let top = 0;
  let right = root.clientWidth;
  let bottom = root.clientHeight;
  for (
    let el = element.parentElement;
    el && el !== root;
    el = el.parentElement
  ) {
    const { overflowX, overflowY } = getComputedStyle(el);
    if (overflowX === "visible" && overflowY === "visible") continue;
    const rect = el.getBoundingClientRect();
    left = Math.max(left, rect.left + el.clientLeft);
    top = Math.max(top, rect.top + el.clientTop);
    right = Math.min(right, rect.left + el.clientLeft + el.clientWidth);
    bottom = Math.min(bottom, rect.top + el.clientTop + el.clientHeight);
  }
  return {
    left: left + EDGE_MARGIN,
    top: top + EDGE_MARGIN,
    right: right - EDGE_MARGIN,
    bottom: bottom - EDGE_MARGIN,
  };
}

// Custom replacement for <input type="date"> and, with `withTime`, for
// <input type="datetime-local">. `onChange` receives the new value string ("" when
// cleared), not an event. Pass `id` to link a <label htmlFor>, or `ariaLabel`.
//
// Like Select, it renders a visually-hidden native input so `required` and `min`
// still block the form's submit with the browser's own message and focus handling.
//
// `defaultTime` is used when a day is picked before any time is set: pass "23:59" on
// an end field, where the whole last day is what's usually meant.
export default function DatePicker({
  id,
  name,
  value = "",
  onChange,
  withTime = false,
  min,
  required = false,
  disabled = false,
  clearable = !required,
  placeholder = withTime ? "Pick a date and time" : "Pick a date",
  defaultTime = "00:00",
  ariaLabel,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState("start");
  const [placement, setPlacement] = useState("bottom");

  const selectedDate = value ? value.slice(0, 10) : "";
  const selectedTime = withTime && value ? value.slice(11, 16) : "";
  const minValue = min ? min.slice(0, withTime ? 16 : 10) : "";
  const minDate = min ? min.slice(0, 10) : "";
  const todayIso = toIsoDate(new Date());

  // The day that takes keyboard focus; it also decides which month is on show
  const [cursor, setCursor] = useState(selectedDate || todayIso);
  const viewDate = fromIsoDate(cursor);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const nativeRef = useRef(null);
  const moveFocusToCursor = useRef(false);
  const popoverId = useId();

  const closePopover = ({ refocus = true } = {}) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const toggleOpen = () => {
    if (open) return closePopover();
    const root = rootRef.current;
    const rect = root.getBoundingClientRect();
    const bounds = getClipBounds(root);
    const height = CALENDAR_HEIGHT + (withTime ? TIME_ROW_HEIGHT : 0);
    const below = bounds.bottom - rect.bottom;
    const above = rect.top - bounds.top;
    setPlacement(below < height && above > below ? "top" : "bottom");
    setAlign(
      rect.left + CALENDAR_WIDTH > bounds.right &&
        rect.right - CALENDAR_WIDTH >= bounds.left
        ? "end"
        : "start",
    );
    setCursor(selectedDate || todayIso);
    moveFocusToCursor.current = true;
    setOpen(true);
  };

  // When the calendar fits neither above nor below (a short window or iframe),
  // slide it back inside the bounds rather than letting it be cut off
  useLayoutEffect(() => {
    const popover = popoverRef.current;
    if (!open || !popover) return;
    popover.style.transform = "";
    const bounds = getClipBounds(popover);
    const { top, bottom, left, right } = popover.getBoundingClientRect();
    let shiftY = 0;
    if (top < bounds.top) shiftY = bounds.top - top;
    else if (bottom > bounds.bottom) {
      shiftY = Math.max(bounds.bottom - bottom, bounds.top - top);
    }
    let shiftX = 0;
    if (left < bounds.left) shiftX = bounds.left - left;
    else if (right > bounds.right) {
      shiftX = Math.max(bounds.right - right, bounds.left - left);
    }
    popover.style.transform =
      shiftX || shiftY
        ? `translate(${Math.round(shiftX)}px, ${Math.round(shiftY)}px)`
        : "";
  }, [open, placement, align]);

  useEffect(() => {
    if (!open) return;
    const handler = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        closePopover({ refocus: false });
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !moveFocusToCursor.current) return;
    moveFocusToCursor.current = false;
    popoverRef.current?.querySelector(`[data-date="${cursor}"]`)?.focus();
  }, [open, cursor]);

  // Native validation for the hidden input: `min` would be ignored on a text input
  useEffect(() => {
    nativeRef.current?.setCustomValidity(
      value && minValue && value.slice(0, minValue.length) < minValue
        ? `Must be on or after ${formatValue(minValue, withTime)}`
        : "",
    );
  }, [value, minValue, withTime]);

  const isDayDisabled = (iso) => Boolean(minDate) && iso < minDate;

  const emit = (date, time) => {
    if (!withTime) return onChange(date);
    const next = `${date}T${time}`;
    // Picking the first allowed day can land before an earlier time on it
    onChange(minValue && next < minValue ? minValue : next);
  };

  const selectDay = (iso) => {
    emit(iso, selectedTime || defaultTime);
    setCursor(iso);
    // With time there's still the time to set, so it stays open until Done
    if (!withTime) closePopover();
  };

  const setTimePart = (hour, minute) =>
    emit(selectedDate || cursor, `${hour}:${minute}`);

  const moveCursor = (nextIso) => {
    moveFocusToCursor.current = true;
    setCursor(minDate && nextIso < minDate ? minDate : nextIso);
  };
  const addDays = (days) => {
    const next = new Date(year, month, viewDate.getDate() + days);
    moveCursor(toIsoDate(next));
  };
  // Keeps the day where it can, or the month's last day (31 Jan -> 28 Feb)
  const toMonth = (y, m) => {
    const lastDay = new Date(y, m + 1, 0).getDate();
    return toIsoDate(new Date(y, m, Math.min(viewDate.getDate(), lastDay)));
  };

  const handleGridKeyDown = (event) => {
    const moves = {
      ArrowLeft: () => addDays(-1),
      ArrowRight: () => addDays(1),
      ArrowUp: () => addDays(-7),
      ArrowDown: () => addDays(7),
      Home: () => addDays(-viewDate.getDay()),
      End: () => addDays(6 - viewDate.getDay()),
      PageUp: () => moveCursor(toMonth(year, month - 1)),
      PageDown: () => moveCursor(toMonth(year, month + 1)),
    };
    if (!moves[event.key]) return;
    event.preventDefault();
    moves[event.key]();
  };

  const handlePopoverKeyDown = (event) => {
    if (event.key !== "Escape") return;
    // Only the calendar closes, not a Modal it sits in
    event.preventDefault();
    event.stopPropagation();
    closePopover();
  };

  // Tabbing out closes it. relatedTarget is null for a click on empty space inside.
  const handleBlur = (event) => {
    if (
      open &&
      event.relatedTarget &&
      !rootRef.current?.contains(event.relatedTarget)
    ) {
      closePopover({ refocus: false });
    }
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const thisYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 101 }, (_, i) => {
    const y = thisYear - 50 + i;
    return { label: String(y), value: y };
  });

  const [hour, minute] = (selectedTime || defaultTime).split(":");
  const showClear = clearable && Boolean(value) && !disabled;

  return (
    <div ref={rootRef} className="relative w-full" onBlur={handleBlur}>
      <input
        ref={nativeRef}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        onChange={() => {}}
        onFocus={() => triggerRef.current?.focus()}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-label={ariaLabel}
        onClick={toggleOpen}
        className={`${className} flex min-h-[2.625rem] items-center text-left ${
          showClear ? "pr-14" : "pr-9"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`min-w-0 truncate ${
            value ? "" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {value ? formatValue(value, withTime) : placeholder}
        </span>
      </button>

      {showClear && (
        <button
          type="button"
          aria-label="Clear date"
          onClick={() => {
            onChange("");
            triggerRef.current?.focus();
          }}
          className="absolute top-1/2 right-8 -translate-y-1/2 cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <CalendarDays className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />

      {open && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label={withTime ? "Choose date and time" : "Choose date"}
          onKeyDown={handlePopoverKeyDown}
          className={`absolute z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-lg dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 ${POPOVER_ALIGN[align]} ${
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor(toMonth(year, month - 1))}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-1">
              <Select
                value={month}
                onChange={(m) => setCursor(toMonth(year, m))}
                options={MONTH_OPTIONS}
                searchable={false}
                ariaLabel="Month"
                className="min-w-0 flex-[3]"
              />
              <Select
                value={year}
                onChange={(y) => setCursor(toMonth(y, month))}
                options={yearOptions}
                searchable={false}
                ariaLabel="Year"
                className="min-w-0 flex-[2]"
              />
            </div>

            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCursor(toMonth(year, month + 1))}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7" aria-hidden="true">
            {DAYS.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-xs font-medium text-gray-400"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7" onKeyDown={handleGridKeyDown}>
            {cells.map((day, i) => {
              if (!day) return <div key={`blank-${i}`} />;
              const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
              const isSelected = iso === selectedDate;
              const isToday = iso === todayIso;
              return (
                <button
                  key={iso}
                  type="button"
                  data-date={iso}
                  disabled={isDayDisabled(iso)}
                  tabIndex={iso === cursor ? 0 : -1}
                  aria-label={`${day} ${MONTHS[month]} ${year}`}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => selectDay(iso)}
                  className={`flex h-8 w-full cursor-pointer items-center justify-center rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent dark:disabled:text-gray-700 ${
                    isSelected
                      ? "bg-gray-900 font-medium text-white dark:bg-gray-200 dark:text-gray-900"
                      : isToday
                        ? "font-semibold text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950/40"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <Clock className="h-4 w-4 shrink-0 text-gray-400" />
              <Select
                value={hour}
                onChange={(h) => setTimePart(h, minute)}
                options={HOUR_OPTIONS}
                searchable={false}
                openDirection="up"
                ariaLabel="Hour"
                className="min-w-0 flex-1"
              />
              <span className="text-gray-400">:</span>
              <Select
                value={minute}
                onChange={(m) => setTimePart(hour, m)}
                options={MINUTE_OPTIONS}
                searchable={false}
                openDirection="up"
                ariaLabel="Minute"
                className="min-w-0 flex-1"
              />
            </div>
          )}

          <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
            <button
              type="button"
              disabled={isDayDisabled(todayIso)}
              onClick={() => selectDay(todayIso)}
              className="flex-1 cursor-pointer rounded-lg py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-500 dark:hover:bg-red-950/40"
            >
              Today
            </button>
            {withTime && (
              <button
                type="button"
                onClick={() => closePopover()}
                className="flex-1 cursor-pointer rounded-lg bg-gray-900 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(value, withTime) {
  const date = fromIsoDate(value.slice(0, 10));
  if (Number.isNaN(date.getTime())) return value;
  const label = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return withTime && value.length >= 16
    ? `${label}, ${value.slice(11, 16)}`
    : label;
}
