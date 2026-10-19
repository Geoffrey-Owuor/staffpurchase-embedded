// The origin the user is actually browsing, for building absolute redirect
// URLs from a route handler. Behind Nginx request.url carries the upstream
// host, so prefer the forwarded headers:
//   Embedded via Nginx:   https://app-host
//   Accessed directly:    http://app-host
export function getRequestBaseUrl(request) {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost";

  return `${proto}://${host}`;
}
