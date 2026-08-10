"use client";

import { useEffect, useState } from "react";
import ThemeToggleCompact from "../Reusables/ThemeProviders/ThemeToggleCompact";
import Link from "next/link";
import { basePath, LandingPageLogo } from "@/public/assets";

const NAV_LINK_CLASSES =
  "relative text-gray-600 transition hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-red-600 after:transition-all after:duration-300 hover:after:w-full dark:after:bg-red-400";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`custom:px-6 fixed top-0 right-0 left-0 z-50 w-full px-0 transition-all duration-300 ${
        scrolled
          ? "custom-blur border-b border-gray-200/80 bg-white/80 shadow-sm dark:border-gray-800/80 dark:bg-gray-950/80"
          : "border-b border-transparent bg-white dark:bg-gray-950"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <LandingPageLogo />

        {/* Navigation */}
        <nav className="navigation:flex hidden space-x-8 px-6 text-sm">
          <a href={`${basePath}#features`} className={NAV_LINK_CLASSES}>
            Features
          </a>
          <a href={`${basePath}#how-it-works`} className={NAV_LINK_CLASSES}>
            How It Works
          </a>
          <Link href="/usermanual" className={NAV_LINK_CLASSES}>
            User Manual
          </Link>
        </nav>

        {/* Auth Buttons  */}
        <div className="flex items-center space-x-2">
          {/* Theme switcher in a fixed space div */}
          <div className="w-8">
            <ThemeToggleCompact />
          </div>
          <Link
            href="/login"
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-600/20"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 hover:shadow-md dark:bg-red-500 dark:hover:bg-red-600"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
