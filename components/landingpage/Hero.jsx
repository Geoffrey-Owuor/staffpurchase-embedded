// app/components/Hero.js
"use client";

import {
  ShoppingBag,
  ArrowRight,
  Check,
  BookMarked,
  Workflow,
  Radar,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import LandingLogo from "./LandingLogo";
import { basePath } from "@/public/assets";

const stats = [
  { icon: Workflow, label: "4-stage approval chain" },
  { icon: Radar, label: "Real-time status tracking" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden py-20">
      {/* Decorative background: soft grid + glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.4] dark:opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(0 0 0 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />
      <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-128 w-lg -translate-x-1/2 rounded-full bg-red-200/40 blur-3xl dark:bg-red-900/20" />

      <div className="px-6">
        <div className="flex flex-col items-center lg:flex-row">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-10 w-full lg:mb-0 lg:w-1/2"
          >
            {/* Landing Logo - Reserving a fixed height for it */}
            <div className="h-40 md:h-50">
              <LandingLogo />
            </div>

            {/* Eyebrow badge */}
            <div className="mb-5 flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold tracking-wide text-red-700 uppercase dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                An exclusive Hotpoint staff benefit
              </span>
            </div>

            <h1 className="mb-6 text-center text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-start lg:text-6xl dark:text-gray-100">
              Purchase requests,{" "}
              <span className="bg-linear-to-r from-red-600 to-rose-500 bg-clip-text text-transparent dark:from-red-500 dark:to-rose-400">
                made effortless.
              </span>
            </h1>
            <p className="mb-8 text-center text-lg text-gray-600 lg:text-start dark:text-gray-300">
              Submit a request and watch it move automatically through Payroll,
              HR, Credit Control, and Invoicing - with live status updates at
              every step, no paperwork required.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/register"
                className="group flex w-full items-center justify-center rounded-full bg-red-600 px-6 py-3 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg sm:w-auto dark:bg-red-500 dark:hover:bg-red-600"
              >
                Get Started{" "}
                <ArrowRight className="ml-2 h-5 w-5 transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href={`${basePath}#how-it-works`}
                className="flex w-full items-center justify-center rounded-full border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                How It Works <BookMarked className="ml-2 h-5 w-5" />
              </a>
            </div>

            {/* Stat highlights */}
            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {stats.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-3 py-2.5 text-sm text-gray-700 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300"
                >
                  <Icon className="h-4 w-4 shrink-0 text-red-600 dark:text-red-500" />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right content (card with features) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
            className="flex w-full justify-center lg:w-1/2"
          >
            <div className="relative w-full lg:max-w-md">
              {/* Blurred background accents */}
              <div className="absolute -top-6 -left-6 h-64 w-64 rounded-full bg-red-100 opacity-70 mix-blend-multiply blur-xl filter dark:bg-red-900/40"></div>
              <div className="absolute -right-8 -bottom-8 h-64 w-64 rounded-full bg-rose-100 opacity-70 mix-blend-multiply blur-xl filter dark:bg-rose-900/40"></div>

              {/* Card */}
              <div className="relative rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/5 dark:border dark:border-gray-800 dark:bg-gray-900/50 dark:ring-white/5">
                <div className="mb-6 flex items-center">
                  <div className="mr-4 rounded-2xl bg-red-100 p-3 dark:bg-red-900/40">
                    <ShoppingBag className="h-6 w-6 text-red-600 dark:text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Staff Purchase Portal
                  </h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-center">
                    <Check className="mr-2 h-5 w-5 text-gray-950 dark:text-white" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Exclusive employee discounts
                    </span>
                  </li>
                  <li className="flex items-center">
                    <Check className="mr-2 h-5 w-5 text-gray-950 dark:text-white" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Easy online requisition
                    </span>
                  </li>
                  <li className="flex items-center">
                    <Check className="mr-2 h-5 w-5 text-gray-950 dark:text-white" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Track your purchase status
                    </span>
                  </li>
                  <li className="flex items-center">
                    <Check className="mr-2 h-5 w-5 text-gray-950 dark:text-white" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Access with your work account
                    </span>
                  </li>
                </ul>

                {/* Floating live-status badge */}
                <div className="absolute -top-4 -right-4 hidden items-center gap-1.5 rounded-full bg-gray-950 px-3 py-1.5 text-xs font-medium text-white shadow-lg sm:flex dark:bg-white dark:text-gray-900">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  Live status tracking
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
