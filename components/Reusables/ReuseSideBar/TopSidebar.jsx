"use client";
import {
  HomeIcon,
  ShoppingBagIcon,
  MessageCircleQuestion,
  Link2,
  ChevronLeft,
  ChevronDown,
  LayoutPanelLeft, // Changed icon to represent switching back to side view
} from "lucide-react";
import HotpointLogo from "../HotpointLogo";
import UserMenu from "../UserMenu";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useSidebarStore } from "@/store/useSidebarStore";

const tabClass = (active) =>
  `flex cursor-default items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
    active
      ? "bg-gray-200 text-black dark:bg-gray-800 dark:text-white"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100"
  }`;

// Gap between tabs (space-x-1)
const TAB_GAP = 4;

function NavTab({ item, active, ...rest }) {
  const { Icon, label, onClick } = item;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={tabClass(active)}
      {...rest}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

// Labels never wrap. Home and New Purchase always show; the role pages
// (useDashboardRoutes().roleNavItems) fill the remaining width, and whatever
// doesn't fit moves into a "More" menu. Widths come from an invisible copy
// of every tab, re-fitted by a ResizeObserver whenever the nav's width
// changes - no fixed item or character limit to maintain.
function TopNav({ items, activeTab, pinnedCount }) {
  const navRef = useRef(null);
  const measureRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(items.length);

  const itemKeys = items.map((item) => item.key).join("|");

  useLayoutEffect(() => {
    const nav = navRef.current;
    const measure = measureRef.current;
    if (!nav || !measure) return;

    const fit = () => {
      const nodes = [...measure.children];
      const moreWidth = nodes.pop().offsetWidth;
      const widths = nodes.map((node) => node.offsetWidth + TAB_GAP);
      const style = getComputedStyle(nav);
      const available =
        nav.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const total = widths.reduce((sum, w) => sum + w, 0);

      if (total <= available) {
        setVisibleCount(items.length);
        return;
      }
      let used = moreWidth + TAB_GAP;
      let count = 0;
      for (const width of widths) {
        if (used + width > available && count >= pinnedCount) break;
        used += width;
        count += 1;
      }
      setVisibleCount(Math.max(count, pinnedCount));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(nav);
    return () => observer.disconnect();
    // Re-measure when the set of tabs changes (role switch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKeys, pinnedCount]);

  const visible = items.slice(0, visibleCount);
  const overflow = items.slice(visibleCount);

  return (
    <nav ref={navRef} className="relative min-w-0 flex-1 px-4">
      <ul className="flex items-center justify-center space-x-1">
        {visible.map((item) => (
          <li key={item.key}>
            <NavTab item={item} active={activeTab === item.key} />
          </li>
        ))}
        {overflow.length > 0 && (
          <li>
            <MoreMenu items={overflow} activeTab={activeTab} />
          </li>
        )}
      </ul>

      {/* Invisible copy used only to measure each tab's natural width */}
      <div
        ref={measureRef}
        aria-hidden="true"
        inert
        className="pointer-events-none invisible fixed top-0 -left-[9999px] flex"
      >
        {items.map((item) => (
          <NavTab key={item.key} item={item} active={false} tabIndex={-1} />
        ))}
        <button type="button" tabIndex={-1} className={tabClass(false)}>
          <span>More</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

// The tabs that didn't fit. Highlighted when the current page is one of
// them; Escape / outside click close it, arrow keys move between items.
function MoreMenu({ items, activeTab }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const hasActive = items.some((item) => item.key === activeTab);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
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
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={tabClass(hasActive)}
      >
        <span>More</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-60 mt-2 min-w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {items.map((item, index) => {
            const { Icon, label, key, onClick } = item;
            const active = activeTab === key;
            return (
              <li key={key} role="none">
                <button
                  ref={(el) => (itemRefs.current[index] = el)}
                  type="button"
                  role="menuitem"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    setOpen(false);
                    onClick();
                  }}
                  className={`${tabClass(active)} w-full`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const TopSidebar = ({
  router,
  handleHomeClick,
  handlePurchaseClick,
  handleNavClick,
  activeTab,
  roleNavItems,
}) => {
  // --- State for header scroll effect ---
  const [isScrolled, setIsScrolled] = useState(false);

  const setShowTopbar = useSidebarStore((state) => state.setShowTopbar);

  const toggleTopbarView = () => {
    setShowTopbar(false);
  };

  //   UseEffect to detect page scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Home + New Purchase are pinned; role pages may overflow into "More"
  const navItems = [
    { key: "home", label: "Home", Icon: HomeIcon, onClick: handleHomeClick },
    {
      key: "newpurchase",
      label: "New Purchase",
      Icon: ShoppingBagIcon,
      onClick: handlePurchaseClick,
    },
    ...roleNavItems.map(({ key, path, label, Icon }) => ({
      key,
      label,
      Icon,
      onClick: () => handleNavClick(path),
    })),
  ];

  return (
    <header
      className={`custom:flex bg-base-classes fixed top-0 right-0 left-0 z-50 hidden h-16 transition-all duration-200 ${
        isScrolled ? "shadow-xs" : ""
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4">
        {/* LEFT SECTION: Logo */}
        <div className="flex shrink-0 items-center gap-4">
          {/* Pass isOpen={true} to ensure full logo is always visible */}
          <HotpointLogo isOpen={true} />
        </div>

        {/* MIDDLE SECTION: Navigation Tabs (fills the space between) */}
        <TopNav items={navItems} activeTab={activeTab} pinnedCount={2} />

        {/* RIGHT SECTION: Utilities & User Menu */}
        <div className="flex shrink-0 items-center gap-3">
          {/* Go back button */}
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-gray-800/50 dark:hover:text-white"
            title="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {/* Sidebar View Toggle */}
          <div
            onClick={toggleTopbarView}
            title="Switch to Side View"
            className="flex cursor-pointer items-center justify-center rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100"
          >
            <LayoutPanelLeft className="h-4 w-4 shrink-0" />
          </div>

          <div className="hidden h-6 w-px bg-gray-200 sm:block dark:bg-gray-700"></div>

          {/* Website / Help: icon-only here to leave room for the nav (the
              sidebar and mobile menu keep their text labels) */}
          <a
            href="https://hotpoint.co.ke"
            title="Hotpoint Website"
            aria-label="Hotpoint Website"
            className="flex items-center rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Link2 className="h-4 w-4 shrink-0" />
          </a>

          <a
            href="mailto:itsupport@hotpoint.co.ke"
            title="Help & Support"
            aria-label="Help & Support"
            className="flex items-center rounded-xl p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-800"
          >
            <MessageCircleQuestion className="h-4 w-4 shrink-0" />
          </a>

          {/* User Menu */}
          <div className="pl-2">
            {/* isSidebarOpen={true} ensures full user details are shown */}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopSidebar;
