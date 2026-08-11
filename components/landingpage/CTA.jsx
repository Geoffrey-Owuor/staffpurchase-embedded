// app/components/CTA.js
import { ArrowRight, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="mx-6 overflow-hidden rounded-3xl bg-gray-950 py-20">
      <div className="relative px-6 text-center">
        {/* Glow accents */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-xl -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -top-10 -right-10 h-56 w-56 rounded-full bg-rose-500/20 blur-3xl" />

        <div className="relative">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            Ready to skip the paperwork?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
            Join the Hotpoint staff already submitting, tracking, and getting
            purchase requests approved - right from the portal.
          </p>
          <div className="flex flex-col justify-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <Link
              href="/register"
              className="flex items-center justify-center rounded-full bg-red-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-red-600/30"
            >
              Sign Up Now <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center rounded-full border border-white/20 px-8 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Existing User? Log In
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
