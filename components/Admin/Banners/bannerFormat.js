import { ROLE_LABELS } from "@/utils/Admin/adminConstants";

// Banner start/end values are DB wall-clock strings ("YYYY-MM-DDTHH:mm",
// see lib/adminBanners.js). Built with the local Date constructor so the
// shown time is exactly the stored one, whatever the browser's timezone.
export function formatBannerTime(value) {
  if (!value) return "";
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const formatBannerWindow = (banner) =>
  `${formatBannerTime(banner.startsAt)} → ${
    banner.endsAt ? formatBannerTime(banner.endsAt) : "no end"
  }`;

export const formatAudience = (targetRoles) =>
  targetRoles.length === 0
    ? "Everyone"
    : targetRoles.map((role) => ROLE_LABELS[role] ?? role).join(", ");
