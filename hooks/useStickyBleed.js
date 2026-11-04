import { useEffect, useRef, useState } from "react";

// Nearest scrolling ancestor - the dashboard scrolls inside <main>, not the
// window, so that's what a sticky element sticks to.
function getScrollParent(el) {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}

// For a sticky element preceded by the returned `sentinelRef` (a zero-height
// marker in the same slot): `isStuck` once the marker has scrolled out of the
// scroll container, and `bleed` - how far the slot's edges sit inside the
// container's inner edges (padding + any space beside a max-width column;
// scrollbar excluded), so the stuck element can stretch edge to edge.
export function useStickyBleed() {
  const sentinelRef = useRef(null);
  const [isStuck, setIsStuck] = useState(false);
  const [bleed, setBleed] = useState({ left: 0, right: 0 });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scroller = getScrollParent(sentinel);
    if (!sentinel || !scroller) return;

    const stuckObserver = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { root: scroller, threshold: 0 },
    );
    stuckObserver.observe(sentinel);

    const measure = () => {
      const slot = sentinel.getBoundingClientRect();
      const box = scroller.getBoundingClientRect();
      const innerLeft = box.left + scroller.clientLeft;
      const innerRight = innerLeft + scroller.clientWidth;
      setBleed({
        left: Math.max(0, slot.left - innerLeft),
        right: Math.max(0, innerRight - slot.right),
      });
    };
    measure();
    // The slot resizes with the column, the scroller with the sidebar
    // toggle and scrollbar appearing/disappearing.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(sentinel);
    resizeObserver.observe(scroller);

    return () => {
      stuckObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  return { sentinelRef, isStuck, bleed };
}
