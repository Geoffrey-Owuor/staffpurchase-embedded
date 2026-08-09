"use client";

import { useState, useRef, useEffect, useId, useMemo } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// Options lists longer than this get a sticky search box at the top of the
// listbox so users don't have to scroll through everything.
const SEARCH_THRESHOLD = 6;

// Accessible single-select listbox, built to replace native <select> elements
// while keeping the same keyboard behavior a native select gives for free:
// Arrow Up/Down to move, Home/End to jump, Enter/Space to commit, Escape to
// close without committing. Visual pattern borrowed from ColumnToggle.jsx.
//
// Pass `name`/`required` to keep native HTML5 required-field validation and
// submit-time focus behavior working: this renders a visually-hidden native
// <select> (kept in sync with `value`) overlaid on the trigger, since this
// component itself is a div/button and not a real form control.
export default function Select({
  id,
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  openDirection = "down",
  disabled = false,
  name,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listboxId = useId();

  const showSearch = options.length > SEARCH_THRESHOLD;

  const filteredOptions = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return options;
    const query = searchQuery.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(query));
  }, [options, searchQuery, showSearch]);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    } else if (showSearch) {
      searchInputRef.current?.focus();
    }
  }, [isOpen, showSearch]);

  // Keep the highlighted index valid whenever the filtered list changes.
  useEffect(() => {
    setHighlightedIndex((current) =>
      filteredOptions.length === 0
        ? -1
        : Math.min(Math.max(current, 0), filteredOptions.length - 1),
    );
  }, [filteredOptions]);

  const openList = (initialIndex) => {
    setIsOpen(true);
    setHighlightedIndex(
      initialIndex ?? (selectedIndex >= 0 ? selectedIndex : 0),
    );
  };

  const closeList = ({ refocus = true } = {}) => {
    setIsOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const commit = (index) => {
    const option = filteredOptions[index];
    if (!option) return;
    onChange(option.value);
    closeList();
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) return;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) openList();
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!isOpen) openList();
        break;
      default:
        break;
    }
  };

  const moveHighlight = (delta) => {
    setHighlightedIndex((i) => {
      if (filteredOptions.length === 0) return -1;
      return Math.min(filteredOptions.length - 1, Math.max(0, i + delta));
    });
  };

  const handleListKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-1);
        break;
      case "Home":
        event.preventDefault();
        setHighlightedIndex(filteredOptions.length ? 0 : -1);
        break;
      case "End":
        event.preventDefault();
        setHighlightedIndex(filteredOptions.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(highlightedIndex);
        break;
      case "Escape":
        event.preventDefault();
        closeList();
        break;
      case "Tab":
        closeList({ refocus: false });
        break;
      default:
        break;
    }
  };

  // Same navigation as handleListKeyDown, minus Home/End (which need to keep
  // their normal text-cursor behavior while the search input is focused).
  const handleSearchKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-1);
        break;
      case "Enter":
        event.preventDefault();
        commit(highlightedIndex);
        break;
      case "Escape":
        event.preventDefault();
        closeList();
        break;
      case "Tab":
        closeList({ refocus: false });
        break;
      default:
        break;
    }
  };

  const activeDescendant =
    highlightedIndex >= 0 ? `${listboxId}-${highlightedIndex}` : undefined;

  return (
    <div
      className={`relative inline-block text-left ${className}`}
      ref={containerRef}
    >
      {/* Visually-hidden native select kept in sync with `value` so this
          still behaves like a real form control: HTML5 `required` validation,
          and browser focus-on-invalid-submit, keep working. */}
      {name && (
        <select
          name={name}
          required={required}
          disabled={disabled}
          value={value ?? ""}
          onChange={() => {}}
          tabIndex={-1}
          className="sr-only"
        >
          <option value="" disabled hidden />
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      <button
        id={id}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => (isOpen ? closeList() : openList())}
        onKeyDown={handleTriggerKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white px-3 py-[11px] text-sm focus:border-gray-500 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
      >
        <span
          className={selectedOption ? "" : "text-gray-400 dark:text-gray-500"}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              scale: 0.95,
              opacity: 0,
              y: openDirection === "down" ? -6 : 6,
            }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{
              scale: 0.95,
              opacity: 0,
              y: openDirection === "down" ? -6 : 6,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`absolute ${openDirection === "down" ? "top-full mt-1" : "bottom-full mb-1"} z-10 w-max min-w-full overflow-hidden rounded-xl border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800`}
          >
            <div className="p-1">
              {showSearch && (
                <div className="sticky top-0 -mx-1 -mt-1 mb-1 bg-white px-1 pt-1 pb-1.5 dark:bg-gray-800">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      role="combobox"
                      aria-expanded="true"
                      aria-controls={listboxId}
                      aria-activedescendant={activeDescendant}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search..."
                      className="w-full rounded-full border border-gray-300 bg-white py-1.5 pr-3 pl-8 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
              <ul
                id={listboxId}
                role="listbox"
                tabIndex={showSearch ? undefined : -1}
                aria-activedescendant={
                  showSearch ? undefined : activeDescendant
                }
                onKeyDown={showSearch ? undefined : handleListKeyDown}
                ref={showSearch ? undefined : (node) => node?.focus()}
                className="max-h-60 overflow-auto [scrollbar-width:thin]"
              >
                {filteredOptions.length === 0 && (
                  <li className="px-3 py-1.5 text-sm text-gray-400 dark:text-gray-500">
                    No matches found
                  </li>
                )}
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    id={`${listboxId}-${index}`}
                    role="option"
                    aria-selected={option.value === value}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => commit(index)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm ${
                      index === highlightedIndex
                        ? "bg-gray-100 dark:bg-gray-700"
                        : ""
                    } ${
                      option.value === value
                        ? "font-medium text-gray-900 dark:text-white"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span>{option.label}</span>
                    {option.value === value && (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
