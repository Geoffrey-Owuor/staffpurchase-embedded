// The origin the user is actually browsing, for building absolute redirect
// URLs from a route handler. Behind Nginx request.url carries the upstream
// host, so prefer the forwarded headers (the Nginx origin when embedded,
// the app's own host:port when accessed directly).
export function getRequestBaseUrl(request) {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost";

  return `${proto}://${host}`;
}
