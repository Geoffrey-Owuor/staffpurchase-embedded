import { ShoppingBag, Check, Radar, FileSpreadsheet } from "lucide-react";
import ThemeToggle from "../ThemeProviders/ThemeToggle";
import { AuthPagesLogo } from "@/public/assets";
import Link from "next/link";

const highlights = [
  { icon: Check, label: "Submit a request in minutes" },
  { icon: Radar, label: "Track approval status live" },
  { icon: FileSpreadsheet, label: "Full history at a glance" },
];

export default function AuthBackground({ children }) {
  return (
    <div className="auth-background relative grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      {/* Branded panel — desktop only */}
      <div className="relative hidden overflow-hidden bg-gray-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Decorative glow + grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(255 255 255 / 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.15) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 0% 0%, black 30%, transparent 100%)",
          }}
        />
        <div className="pointer-events-none absolute -top-16 -left-16 h-96 w-96 rounded-full bg-red-600/25 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl" />

        {/* Logo */}
        <Link
          href="/"
          className="relative flex items-center gap-2 text-2xl font-semibold text-white"
        >
          <ShoppingBag className="h-6 w-6" />
          <span>
            Hot<span className="text-red-500">p</span>oint
          </span>
        </Link>

        {/* Headline + highlights */}
        <div className="relative max-w-md">
          <h2 className="mb-4 text-3xl leading-tight font-bold text-white">
            Get approved, faster.
          </h2>
          <p className="mb-8 text-gray-400">
            The self-service portal for staff purchase requests - no paperwork,
            no chasing emails, just a clear path from submission to approval.
          </p>
          <ul className="space-y-3">
            {highlights.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 text-sm text-gray-200"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Icon className="h-3.5 w-3.5 text-red-400" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative text-sm text-gray-500">
          © {new Date().getFullYear()} Hotpoint Appliances Ltd
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col items-center justify-center px-4 py-16">
        {/* Logo — mobile/tablet only, since the branded panel carries it on desktop */}
        <div className="fixed top-4 left-4 z-50 lg:hidden">
          <AuthPagesLogo />
        </div>

        {/* Page-specific content (e.g., Login card, Register card) */}
        <div className="w-[350px] md:w-[400px]">{children}</div>

        {/* Footer text — mobile/tablet only */}
        <div className="mt-8 lg:hidden">
          <span className="text-sm text-gray-700 dark:text-gray-400">
            © {new Date().getFullYear()} Hotpoint Appliances Ltd
          </span>
        </div>

        {/* Theme Toggle */}
        <div className="fixed right-4 bottom-4 z-50 hidden sm:block">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
