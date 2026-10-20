"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { basePath } from "@/public/assets";
import BannerCard from "./BannerCard";

const DISMISSED_KEY = "dismissed_system_banners";

// A dismissal is tied to the banner's updated_at, so editing a banner (admin
// Banners page or the DB) makes it reappear for users who had dismissed it.
const dismissKey = (banner) => `${banner.id}:${banner.updatedAt}`;

function readDismissed() {
  try {
    const stored = JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function writeDismissed(keys) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(keys));
  } catch {
    // Private mode / blocked storage - dismissal just won't persist
  }
}

async function fetchBanners() {
  const response = await fetch(`${basePath}/api/banners`);
  if (!response.ok) throw new Error("Failed to fetch banners");
  return response.json();
}

export default function SystemBanners() {
  const [dismissed, setDismissed] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  const { data: banners = [] } = useQuery({
    queryKey: ["system-banners"],
    queryFn: fetchBanners,
    // Long-lived tabs pick up new banners without a reload
    refetchInterval: 5 * 60 * 1000,
  });

  // localStorage is only read after mount to keep SSR/hydration consistent
  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  // Re-check starts_at/ends_at every 30s so scheduled banners appear and
  // disappear on time without needing a refetch
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const visible = useMemo(
    () =>
      banners.filter((banner) => {
        if (banner.startsAt && Date.parse(banner.startsAt) > now) return false;
        if (banner.endsAt && Date.parse(banner.endsAt) <= now) return false;
        if (banner.dismissible && dismissed.includes(dismissKey(banner)))
          return false;
        return true;
      }),
    [banners, dismissed, now],
  );

  const handleDismiss = (banner) => {
    // Only keep keys for banners that still exist so storage doesn't grow forever
    const liveKeys = new Set(banners.map(dismissKey));
    const next = [
      ...dismissed.filter((key) => liveKeys.has(key)),
      dismissKey(banner),
    ];
    setDismissed(next);
    writeDismissed(next);
  };

  if (visible.length === 0) return null;

  return (
    <div className="mb-2 flex flex-col gap-2">
      {visible.map((banner) => (
        <BannerCard
          key={banner.id}
          severity={banner.severity}
          message={banner.message}
          onDismiss={
            banner.dismissible ? () => handleDismiss(banner) : undefined
          }
        />
      ))}
    </div>
  );
}
