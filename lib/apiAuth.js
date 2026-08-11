import { getCurrentUser } from "@/app/lib/auth";

// Wraps an API route handler with a session/role check.
// Usage: export const GET = requireAuth(handler, { roles: ["cc", "bi"] });
// Omit `roles` to only require a valid session (any role allowed).
export function requireAuth(handler, { roles } = {}) {
  return async function wrapped(request, context) {
    const user = await getCurrentUser();

    if (!user?.valid) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (roles && !roles.includes(user.role)) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    return handler(request, { ...context, user });
  };
}
