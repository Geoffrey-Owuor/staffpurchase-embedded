// Shared page scroll lock. Every overlay (modals, the mobile drawer) takes a
// lock instead of writing documentElement.style.overflow itself, so one
// overlay closing can't unlock the page while another is still open (e.g.
// the drawer closing as the Settings modal it launched opens).
let locks = 0;

// Returns the release function; calling it more than once is a no-op.
export function lockPageScroll() {
  if (locks++ === 0) document.documentElement.style.overflow = "hidden";

  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) document.documentElement.style.overflow = "";
  };
}
