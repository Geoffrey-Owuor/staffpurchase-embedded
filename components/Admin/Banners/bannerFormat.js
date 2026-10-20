import { ROLE_LABELS } from "@/utils/Admin/adminConstants";
import { formatWallClock } from "@/utils/Admin/wallClock";

export const formatBannerTime = formatWallClock;

export const formatBannerWindow = (banner) =>
  `${formatBannerTime(banner.startsAt)} → ${
    banner.endsAt ? formatBannerTime(banner.endsAt) : "no end"
  }`;

export const formatAudience = (targetRoles) =>
  targetRoles.length === 0
    ? "Everyone"
    : targetRoles.map((role) => ROLE_LABELS[role] ?? role).join(", ");
