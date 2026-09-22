import { useEffect, useState } from "react";

// Returns `value`, but only updates after `delayMs` has passed without it
// changing again. Used to avoid firing a network request on every keystroke.
export function useDebouncedValue(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}
