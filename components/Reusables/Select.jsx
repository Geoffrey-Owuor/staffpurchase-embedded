"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// Accessible single-select listbox, built to replace native <select> elements
// while keeping the same keyboard behavior a native select gives for free:
// Arrow Up/Down to move, Home/End to jump, Enter/Space to commit, Escape to
// close without committing. Visual pattern borrowed from ColumnToggle.jsx.
export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxId = useId();

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
    const option = options[index];
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

  const handleListKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        event.preventDefault();
        setHighlightedIndex(0);
        break;
      case "End":
        event.preventDefault();
        setHighlightedIndex(options.length - 1);
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

  return (
    <div
      className={`relative inline-block text-left ${className}`}
      ref={containerRef}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => (isOpen ? closeList() : openList())}
        onKeyDown={handleTriggerKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
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
          <motion.ul
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${listboxId}-${highlightedIndex}`
                : undefined
            }
            onKeyDown={handleListKeyDown}
            ref={(node) => node?.focus()}
            initial={{ scale: 0.95, opacity: 0, y: -6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-full z-10 mt-1 max-h-60 w-max min-w-full overflow-auto rounded-xl border border-gray-300 bg-white p-1 shadow-lg focus:outline-none dark:border-gray-600 dark:bg-gray-800"
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => commit(index)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm ${
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
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
