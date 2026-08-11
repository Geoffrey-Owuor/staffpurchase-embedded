/** @type {import('next').NextConfig} */

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Redirects old per-role dashboard URLs to the unified /dashboard tree.
// `permanent: false` (307/308) during rollout so browsers/proxies don't
// cache these as permanent while the new routes are still settling.
// Next applies `basePath` to these automatically - do not prefix manually here
// (unlike middleware.js, which runs before Next's routing layer applies it).
const oldToNewRedirects = [
  ["/staffdashboard/purchase-history/:path*", "/dashboard/:path*"],
  ["/staffdashboard/new-purchase", "/dashboard/new-purchase"],
  ["/staffdashboard", "/dashboard"],
  ["/payrolldashboard/purchases-history/:path*", "/dashboard/:path*"],
  ["/payrolldashboard/new-purchase", "/dashboard/new-purchase"],
  ["/payrolldashboard", "/dashboard"],
  ["/hrdashboard/requests-history/:path*", "/dashboard/:path*"],
  ["/hrdashboard/new-purchase", "/dashboard/new-purchase"],
  ["/hrdashboard", "/dashboard"],
  ["/ccdashboard/purchases-history/:path*", "/dashboard/:path*"],
  ["/ccdashboard/payment-tracking", "/dashboard/payment-tracking"],
  ["/ccdashboard/new-purchase", "/dashboard/new-purchase"],
  ["/ccdashboard", "/dashboard"],
  ["/bidashboard/purchases-history/:path*", "/dashboard/:path*"],
  ["/bidashboard/new-purchase", "/dashboard/new-purchase"],
  ["/bidashboard", "/dashboard"],
  // The /dashboard/history subtree was folded into /dashboard directly
  // (home already shows the full, filterable history) - catch any bookmarks
  // or hardcoded links still pointing at the old path.
  ["/dashboard/history/:path*", "/dashboard/:path*"],
  ["/dashboard/history", "/dashboard"],
].map(([source, destination]) => ({ source, destination, permanent: false }));

const nextConfig = {
  basePath: basePath,
  async redirects() {
    return oldToNewRedirects;
  },
};

export default nextConfig;
