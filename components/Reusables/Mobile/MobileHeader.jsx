"use client";

import {
  X,
  HomeIcon,
  ShoppingBagIcon,
  MessageCircleQuestion,
  Link2,
  ChevronLeft,
  Menu,
  NotebookText,
} from "lucide-react";
import HotpointLogo from "../HotpointLogo";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import UserMenu from "../UserMenu";
import { useDashboardRoutes } from "@/utils/HandleActionClicks/useDashboardRoutes";
import Link from "next/link";
import { lockPageScroll } from "@/utils/scrollLock";

const navItemClass =
  "flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-base font-semibold";
const navItemIdle =
  "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100";
const navItemActive =
  "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white";

export default function MobileHeader() {
  // --- State and logic for Mobile Sidebar ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // While open: lock page scroll (screens wider than 640px) and close on Escape
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const unlockScroll =
      window.innerWidth >= 640 ? lockPageScroll() : () => {};
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      unlockScroll();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const { homePath, purchasePath, roleNavItems, navigate } =
    useDashboardRoutes();

  // navigate() is a no-op for the current page; the menu closes either way
  const handleNavClick = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { path: homePath, label: "Home", Icon: HomeIcon },
    { path: purchasePath, label: "New Purchase", Icon: ShoppingBagIcon },
    ...roleNavItems,
  ];

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="custom:hidden fixed right-0 left-0 z-50 transition-all duration-200 ease-in-out">
        <div className="flex items-center justify-between border-gray-800 p-3">
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              title="Open menu"
              className="rounded-full p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <HotpointLogo />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-full p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <Link
              href="/usermanual"
              target="_blank"
              title="Check manual"
              aria-label="Check manual"
              className="rounded-full p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
            >
              <NotebookText className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* --- Mobile Sidebar (Drawer) --- */}

      {/* Sidebar Backdrop */}
      <div
        className={`custom:hidden fixed inset-0 z-60 bg-black/50 transition-opacity duration-200 ease-in-out dark:bg-black/70 ${
          isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Sidebar Content */}
      {/* inert while closed: it's only translated off-screen, so keep it out
          of the tab order and the accessibility tree */}
      <div
        inert={!isMobileMenuOpen}
        className={`custom:hidden fixed top-0 bottom-0 left-0 z-70 flex w-70 transform flex-col bg-white p-4 shadow-lg transition-transform duration-300 ease-in-out dark:bg-gray-950 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Menu</h2>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
            className="rounded-full p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="mt-6 grow">
          <ul className="space-y-2">
            {navItems.map(({ path, label, Icon }) => {
              const isActive =
                pathname === path ||
                (path !== homePath && pathname.startsWith(`${path}/`));
              return (
                <li key={path}>
                  <button
                    type="button"
                    onClick={() => handleNavClick(path)}
                    aria-current={isActive ? "page" : undefined}
                    className={`${navItemClass} ${isActive ? navItemActive : navItemIdle}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section (Help & User & Hotpoint Website Link) */}
        <div className="mt-6 space-y-4 pt-4">
          <a
            href="https://hotpoint.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100"
          >
            <Link2 className="h-5 w-5 shrink-0" />
            <span>Hotpoint Website</span>
          </a>
          <a
            href="mailto:itsupport@hotpoint.co.ke"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-800"
          >
            <MessageCircleQuestion className="h-5 w-5 shrink-0" />
            <span>Help & Support</span>
          </a>

          <div className="ml-1">
            <UserMenu
              hideMobileMenu={() => setIsMobileMenuOpen(false)}
              menuOpen={true}
            />
          </div>
        </div>
      </div>
    </>
  );
}
