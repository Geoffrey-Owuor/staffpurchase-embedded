"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

// The "D" key switches between light and dark. Mounted once in the root layout,
// because the theme toggles come and go (the user menu's only exists while the
// menu is open).
export default function ThemeShortcut() {
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Leave browser shortcuts like Ctrl+D (bookmark) alone
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Ignore if user is typing in an input, textarea, or contenteditable element
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target.isContentEditable
      ) {
        return;
      }
      if (e.key === "d" || e.key === "D") {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [setTheme, resolvedTheme]);

  return null;
}
