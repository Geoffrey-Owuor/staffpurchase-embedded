"use client";
import { useEffect, useRef, useState } from "react";

const FADE = "1.5rem";

// Fades a scroll container's top/bottom edge while there's more content
// that way - a cue that a nav list scrolls on short screens. Uses a mask
// (not an overlay gradient), so it works over any background. Returns a ref
// for the scroller and the style to spread onto it (undefined when nothing
// is hidden). Re-checks on scroll and whenever the scroller or its direct
// children resize (e.g. a nav group expanding).
export function useScrollFade() {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const top = el.scrollTop > 1;
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
      setEdges((prev) =>
        prev.top === top && prev.bottom === bottom ? prev : { top, bottom },
      );
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    [...el.children].forEach((child) => observer.observe(child));
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  if (!edges.top && !edges.bottom) return [ref, undefined];
  const mask = `linear-gradient(to bottom, ${edges.top ? "transparent" : "#000"}, #000 ${FADE}, #000 calc(100% - ${FADE}), ${edges.bottom ? "transparent" : "#000"})`;
  return [ref, { maskImage: mask, WebkitMaskImage: mask }];
}
