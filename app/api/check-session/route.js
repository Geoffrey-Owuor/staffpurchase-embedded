import { cookies } from "next/headers";
import { getCurrentUser } from "@/app/lib/auth";
import { isSessionCurrent } from "@/lib/sessionCheck";

//Api to check if a valid session cookie still exists (and that the account
//behind it hasn't been deactivated or had its sessions ended since)
export async function GET(_req) {
  try {
    //check if there is a valid user logged in
    const user = await getCurrentUser();

    if (user?.valid && user?.id && (await isSessionCurrent(user))) {
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
