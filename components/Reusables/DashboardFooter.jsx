import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/usermanual", label: "User Manual" },
  { href: "/changelog", label: "Changelog" },
];

export default function DashboardFooter() {
  return (
    <footer className="relative py-5 text-center text-sm">
      <span className="text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Hotpoint Appliances Ltd
      </span>
      {/* The sidebar and topbar don't link these on desktop. A new tab, because
          this footer is also under forms that a same-tab click would lose. */}
      <nav
        aria-label="Footer"
        className="mt-2 flex justify-center gap-4 md:absolute md:top-1/2 md:right-4 md:mt-0 md:-translate-y-1/2"
      >
        {FOOTER_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            target="_blank"
            className="text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
