// app/components/Footer.js
import { ShoppingBag, ArrowUpRight, Mail } from "lucide-react";
import ThemeToggle from "../Reusables/ThemeProviders/ThemeToggle";
import Link from "next/link";
import { basePath } from "@/public/assets";

export default function Footer() {
  return (
    <footer className="relative py-16 text-gray-700 dark:text-white">
      {/* Top hairline accent */}
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-gray-200 to-transparent dark:via-gray-800" />

      <div className="px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {/* Brand */}
          <div className="sm:col-span-1">
            <div className="mb-4 flex items-center space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 dark:bg-white">
                <ShoppingBag className="h-5 w-5 text-white dark:text-gray-950" />
              </div>
              <span className="text-xl font-bold">Hotpoint Staff</span>
            </div>
            <p className="max-w-xs text-gray-500 dark:text-gray-400">
              The internal home for staff purchase requests - submit, track, and
              get approved without the paperwork.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide text-gray-900 uppercase dark:text-white">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {["Features", "How It Works"].map((item, idx) => (
                <li key={idx}>
                  <a
                    href={`${basePath}#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    className="group inline-flex items-center gap-1 text-gray-600 transition hover:text-red-600 dark:text-gray-400 dark:hover:text-white"
                  >
                    {item}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/usermanual"
                  className="group inline-flex items-center gap-1 text-gray-600 transition hover:text-red-600 dark:text-gray-400 dark:hover:text-white"
                >
                  User Manual
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                </Link>
              </li>
              <li>
                <Link
                  href="/changelog"
                  className="group inline-flex items-center gap-1 text-gray-600 transition hover:text-red-600 dark:text-gray-400 dark:hover:text-white"
                >
                  Changelog
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide text-gray-900 uppercase dark:text-white">
              Connect With Us
            </h3>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Have questions? Our team is here to help.
            </p>
            <a
              href="mailto:itsupport@hotpoint.co.ke"
              className="inline-flex items-center gap-2 font-medium text-red-600 transition hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
            >
              <Mail className="h-4 w-4" />
              itsupport@hotpoint.co.ke
            </a>
            <div className="mt-4 block w-22 sm:hidden">
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="relative mt-12 border-t border-gray-200 pt-8 dark:border-gray-800">
          {/* Centered Part */}
          <div className="flex items-center justify-center space-x-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Hotpoint Appliances Ltd
            </span>
          </div>

          {/* ThemeToggle pinned right */}
          <div className="absolute top-10.5 right-0 hidden -translate-y-1/2 sm:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
