// The origin the user is actually browsing, for building absolute redirect
// URLs from a route handler. Behind Nginx request.url carries the upstream
// host, so prefer the forwarded headers:
//   Embedded via Nginx:   https://192.168.0.27:4443
//   Accessed directly:    http://192.168.0.27:10556
export function getRequestBaseUrl(request) {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "127.0.0.1:10556";

  return `${proto}://${host}`;
}
