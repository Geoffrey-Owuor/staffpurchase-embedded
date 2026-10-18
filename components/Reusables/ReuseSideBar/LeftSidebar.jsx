import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  HomeIcon,
  ShoppingBagIcon,
  MessageCircleQuestion,
  Link2,
  ChevronLeft,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutPanelTop,
} from "lucide-react";
import HotpointLogo from "../HotpointLogo";
import UserMenu from "../UserMenu";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useScrollFade } from "@/hooks/useScrollFade";
import { navItemContains } from "@/utils/HandleActionClicks/useDashboardRoutes";
import { useNavGroupOpen, useNavMenu } from "./useNavMenu";

const rowClass = (active) =>
  `flex w-full cursor-default items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
    active
      ? "bg-gray-200 text-black dark:bg-gray-800 dark:text-white"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100"
  }`;

const utilityClass =
  "flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors";

// Label that slides shut with the sidebar. The text stays in the DOM, so it
// remains the row's accessible name; `title` gives the icon-only rail a
// tooltip.
function RowLabel({ sidebarOpen, children }) {
  return (
    <span
      className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
        sidebarOpen ? "w-40" : "w-0"
      }`}
    >
      {children}
    </span>
  );
}

function NavRow({ Icon, label, active, onClick, sidebarOpen, nested }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={sidebarOpen ? undefined : label}
      className={rowClass(active)}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {nested ? (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      ) : (
        <RowLabel sidebarOpen={sidebarOpen}>{label}</RowLabel>
      )}
    </button>
  );
}

// A nav group (e.g. Admin): a collapsible section in the open sidebar, a
// flyout menu in the collapsed rail (no room to expand in place). The
// header is highlighted while one of its pages is current and it's closed.
function NavGroup({ group, activeTab, sidebarOpen, onNavigate }) {
  const active = navItemContains(group, activeTab);
  const [expanded, setExpanded] = useNavGroupOpen(active);
  const listId = useId();

  if (!sidebarOpen) {
    return (
      <NavFlyout
        group={group}
        active={active}
        activeTab={activeTab}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded(!expanded)}
        className={rowClass(active && !expanded)}
      >
        <group.Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {/* grid-rows 0fr -> 1fr animates to the content's natural height */}
      <div
        id={listId}
        inert={!expanded}
        className={`grid transition-[grid-template-rows] duration-200 ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="mt-1 ml-5 space-y-1 border-l border-gray-200 pl-1.5 dark:border-gray-800">
            {group.children.map(({ key, path, label, Icon }) => (
              <li key={key}>
                <NavRow
                  Icon={Icon}
                  label={label}
                  active={activeTab === key}
                  onClick={() => onNavigate(path)}
                  sidebarOpen
                  nested
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

// Portaled to <body> with fixed coordinates so the nav's scroll container
// (and its fade mask) can't clip it. Opens beside the rail, growing down
// from the button in the top half of the screen and up from it in the
// bottom half; it closes if anything scrolls or the window resizes, since
// its position would go stale.
function NavFlyout({ group, active, activeTab, onNavigate }) {
  const { open, setOpen, buttonRef, menuRef, itemRefs, handleMenuKeyDown } =
    useNavMenu();
  const [position, setPosition] = useState(null);
  const menuId = useId();

  const toggle = () => {
    if (!open) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition(
        rect.top < window.innerHeight / 2
          ? { left: rect.right + 8, top: rect.top }
          : { left: rect.right + 8, bottom: window.innerHeight - rect.bottom },
      );
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    // Scrolling inside the flyout itself (if it's taller than the screen) is fine
    const closeOnScroll = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("resize", close);
    document.addEventListener("scroll", closeOnScroll, true);
    return () => {
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [open, menuRef, setOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title={group.label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className={rowClass(active || open)}
      >
        <group.Icon className="h-4 w-4 shrink-0" />
        <RowLabel sidebarOpen={false}>{group.label}</RowLabel>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={position}
            className="fixed z-60 max-h-[calc(100dvh-1rem)] min-w-48 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            <p
              aria-hidden="true"
              className="px-3 pt-1.5 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400"
            >
              {group.label}
            </p>
            <ul
              id={menuId}
              role="menu"
              aria-label={group.label}
              onKeyDown={handleMenuKeyDown}
            >
              {group.children.map(({ key, path, label, Icon }, index) => (
                <li key={key} role="none">
                  <button
                    ref={(el) => (itemRefs.current[index] = el)}
                    type="button"
                    role="menuitem"
                    aria-current={activeTab === key ? "page" : undefined}
                    onClick={() => {
                      setOpen(false);
                      onNavigate(path);
                    }}
                    className={rowClass(activeTab === key)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

const LeftSidebar = ({
  router,
  handleHomeClick,
  handlePurchaseClick,
  handleNavClick,
  activeTab,
  roleNavItems,
}) => {
  const sidebarOpen = useSidebarStore((state) => state.sidebarOpen);
  const setSidebarOpen = useSidebarStore((state) => state.setSidebarOpen);
  const setShowTopbar = useSidebarStore((state) => state.setShowTopbar);
  const [navRef, navFadeStyle] = useScrollFade();
  return (
    <div
      className={`custom:flex fixed top-0 bottom-0 left-0 z-50 hidden flex-col transition-all duration-200 ${
        sidebarOpen ? "w-58" : "w-14"
      }`}
    >
      <div className="relative flex min-h-0 grow flex-col">
        <div className="relative mt-2 flex shrink-0 px-4.5 pb-[11.5px]">
          {/* Hotpoint Logo */}
          <HotpointLogo isOpen={sidebarOpen} />

          <button
            type="button"
            onClick={() => router.back()}
            className={`absolute ${sidebarOpen ? "top-[1.5px] left-39" : "top-11 left-[13px]"} rounded-full bg-gray-100 p-1.5 text-gray-900 transition-all duration-200 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-white dark:hover:bg-gray-800`}
            title="Go back"
            aria-label="Go back"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>

          {/* Toggling the sidebar */}

          <button
            type="button"
            className={`absolute ${sidebarOpen ? "top-[1.5px] left-48" : "top-20 left-[13px]"} rounded-lg bg-gray-100 p-1.5 text-gray-900 transition-all duration-200 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-white dark:hover:bg-gray-800`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4.5 w-4.5" />
            ) : (
              <PanelLeftOpen className="h-4.5 w-4.5" />
            )}
          </button>
        </div>

        {/* Navigation Buttons - the only scrolling region, so the header and
            the user menu stay visible however many role items there are;
            its edges fade while there's more to scroll */}
        <nav
          ref={navRef}
          style={navFadeStyle}
          className={`${sidebarOpen ? "mt-1" : "mt-20"} min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2 transition-all duration-200 [scrollbar-width:thin]`}
        >
          <ul className="space-y-1">
            <li>
              <NavRow
                Icon={HomeIcon}
                label="Home"
                active={activeTab === "home"}
                onClick={handleHomeClick}
                sidebarOpen={sidebarOpen}
              />
            </li>

            <li>
              <NavRow
                Icon={ShoppingBagIcon}
                label="New Purchase"
                active={activeTab === "newpurchase"}
                onClick={handlePurchaseClick}
                sidebarOpen={sidebarOpen}
              />
            </li>

            {roleNavItems.map((item) => (
              <li key={item.key}>
                {item.children ? (
                  <NavGroup
                    group={item}
                    activeTab={activeTab}
                    sidebarOpen={sidebarOpen}
                    onNavigate={handleNavClick}
                  />
                ) : (
                  <NavRow
                    Icon={item.Icon}
                    label={item.label}
                    active={activeTab === item.key}
                    onClick={() => handleNavClick(item.path)}
                    sidebarOpen={sidebarOpen}
                  />
                )}
              </li>
            ))}
          </ul>
        </nav>
        {/* Help & Support, Hotpoint Website & User Menu - pinned outside the
            scroller so UserMenu's upward popup isn't clipped; compacted on
            short screens */}
        <div className="short:space-y-1 short:py-2 shrink-0 space-y-4 px-2 py-3">
          <button
            type="button"
            onClick={() => setShowTopbar(true)}
            title={sidebarOpen ? undefined : "Topbar View"}
            className={`${utilityClass} text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100`}
          >
            <LayoutPanelTop className="h-4 w-4 shrink-0" />
            <RowLabel sidebarOpen={sidebarOpen}>Topbar View</RowLabel>
          </button>
          <a
            href="https://hotpoint.co.ke"
            title={sidebarOpen ? undefined : "Hotpoint Website"}
            className={`${utilityClass} text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Link2 className="h-4 w-4 shrink-0" />
            <RowLabel sidebarOpen={sidebarOpen}>Hotpoint Website</RowLabel>
          </a>
          <a
            href="mailto:itsupport@hotpoint.co.ke"
            title={sidebarOpen ? undefined : "Help & Support"}
            className={`${utilityClass} text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-800`}
          >
            <MessageCircleQuestion className="h-4 w-4 shrink-0" />
            <RowLabel sidebarOpen={sidebarOpen}>Help & Support</RowLabel>
          </a>

          <UserMenu />
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
