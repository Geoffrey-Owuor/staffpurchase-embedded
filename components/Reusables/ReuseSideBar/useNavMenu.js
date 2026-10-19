"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Open state + keyboard handling shared by the nav's popup menus (topbar
// "More"/group dropdowns, the collapsed sidebar's group flyout). Opening
// focuses the first item; Escape / outside click / Tab close it and arrow
// keys move between items. Attach `buttonRef` to the trigger, `menuRef` to
// the popup (it may be portaled - both count as "inside"), `itemRefs` to
// each item and `handleMenuKeyDown` to the popup.
export function useNavMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (
        buttonRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    itemRefs.current[0]?.focus();
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleMenuKeyDown = (event) => {
    const focusable = itemRefs.current.filter(Boolean);
    const index = focusable.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusable[(index + 1) % focusable.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusable[(index - 1 + focusable.length) % focusable.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      focusable[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      focusable[focusable.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return { open, setOpen, buttonRef, menuRef, itemRefs, handleMenuKeyDown };
}

// Expanded state of a collapsible nav group: open while one of its pages is
// the current page, closed elsewhere, reset on every navigation - the user
// can still toggle it in between. Nothing is persisted.
export function useNavGroupOpen(active) {
  const pathname = usePathname();
  const [open, setOpen] = useState(active);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(active);
  }
  return [open, setOpen];
}
