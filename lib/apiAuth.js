import { cookies } from "next/headers";
import { getCurrentUser } from "@/app/lib/auth";
import { isSessionCurrent } from "@/lib/sessionCheck";

// Wraps an API route handler with a session/role check.
// Usage: export const GET = requireAuth(handler, { roles: ["cc", "bi"] });
// Omit `roles` to only require a valid session (any role allowed).
// Besides the JWT, the account itself is checked (active, same
// session_version) so a deactivated or role-changed user is cut off at once.
export function requireAuth(handler, { roles } = {}) {
  return async function wrapped(request, context) {
    const user = await getCurrentUser();

    if (!user?.valid) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!(await isSessionCurrent(user))) {
      (await cookies()).delete("session_token");
      return Response.json(
        { message: "Your session has ended, please sign in again" },
        { status: 401 },
      );
    }

    if (roles && !roles.includes(user.role)) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    return handler(request, { ...context, user });
  };
}
