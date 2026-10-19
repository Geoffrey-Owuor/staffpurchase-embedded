"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { basePath } from "@/public/assets";

const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const SESSION_CHECK_THROTTLE_MS = 60 * 1000;

export function useAuthSync(user) {
  const router = useRouter();
  const lastCheckedRef = useRef(null);

  useEffect(() => {
    const localUserId = user?.id;
    if (!localUserId) return;

    // Set the initial timestamp when the component mounts/user changes
    if (lastCheckedRef.current === null) {
      lastCheckedRef.current = Date.now();
    }

    // 1. Initialize Modern Cross-Tab communication channel
    const authChannel = new BroadcastChannel("auth_session_sync");

    const handleCrossTabMessage = async (event) => {
      const { action, userId } = event.data;

      if (action === "LOGOUTEMBED") {
        window.location.href = `${basePath}/login`;
      } else if (action === "LOGINEMBED" && userId !== localUserId) {
        // Another tab logged in as a different user - reload the tab
        window.location.reload();
      }
    };

    authChannel.addEventListener("message", handleCrossTabMessage);

    // 2. Server-side revocation (admin deactivated the account, changed its
    // role, or the password was reset): the JWT still looks valid, so ask
    // the server when the tab regains focus and every few minutes.
    const checkSession = async () => {
      if (Date.now() - lastCheckedRef.current < SESSION_CHECK_THROTTLE_MS) {
        return;
      }
      lastCheckedRef.current = Date.now();
      try {
        const response = await fetch(`${basePath}/api/check-session`);
        if (!response.ok) return; // a server error isn't a verdict
        const { loggedIn } = await response.json();
        if (loggedIn === false) window.location.href = `${basePath}/login`;
      } catch {
        // offline - try again next time
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkSession();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = setInterval(checkSession, SESSION_CHECK_INTERVAL_MS);

    // Cleanup listeners on unmount
    return () => {
      authChannel.removeEventListener("message", handleCrossTabMessage);
      authChannel.close();
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(intervalId);
    };
  }, [user, router]);
}
