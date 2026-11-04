import { useEffect, useRef, useState } from "react";

// Nearest scrolling ancestor - the dashboard scrolls inside <main>, not the
// window, so that's what a sticky element sticks to.
export function getScrollParent(el) {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}

// The scroller's exact inner edges (scrollbar excluded), from a throwaway
// absolutely positioned child, so the scroller must be positioned (<main> is).
// clientLeft/clientWidth are rounded: at 150% display scaling a 1px border is
// really 0.67px, so they put the right edge up to a pixel too far out, and a
// stuck element stretched to it overflows and brings up a horizontal scrollbar.
function getInnerEdges(scroller) {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;left:0;right:0;height:0;visibility:hidden";
  scroller.appendChild(probe);
  const { left, right } = probe.getBoundingClientRect();
  probe.remove();
  return { left, right };
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
      const inner = getInnerEdges(scroller);
      // Rounded down: float noise alone (a 0.01px overshoot) can overflow too
      const toBleed = (gap) => Math.max(0, Math.floor(gap * 10) / 10);
      setBleed({
        left: toBleed(slot.left - inner.left),
        right: toBleed(inner.right - slot.right),
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
