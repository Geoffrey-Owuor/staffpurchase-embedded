import { cookies } from "next/headers";
import { getCurrentUser } from "@/app/lib/auth";
import { isSessionCurrent } from "@/lib/sessionCheck";
import { isStaffAllowed } from "@/lib/staffDirectory";

//Api to check if a valid session cookie still exists (and that the account
//behind it hasn't been deactivated or had its sessions ended since)
export async function GET(_req) {
  try {
    //check if there is a valid user logged in
    const user = await getCurrentUser();

    // The staff check (Hub staff directory, fails open) is here rather than
    // in isSessionCurrent: it's an HTTP call, too slow for every request, so
    // a session whose staff record HR deactivated ends on the next poll
    if (
      user?.valid &&
      user?.id &&
      (await isSessionCurrent(user)) &&
      (await isStaffAllowed(user.id, user.payrollNo))
    ) {
      //Session is valid
      return Response.json({ loggedIn: true, userId: user.id });
    } else {
      //Session is invalid
      if (user?.valid) (await cookies()).delete("session_token");
      return Response.json({ loggedIn: false, userId: null });
    }
  } catch (error) {
    //An error during session validation (e.g. DB unreachable) - not a
    //verdict, so useAuthSync ignores it rather than signing the user out
    console.error("Session validation error:", error);
    return Response.json({ loggedIn: null }, { status: 500 });
  }
}
