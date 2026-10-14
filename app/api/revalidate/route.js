import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { VALID_CACHE_TAGS } from "@/utils/Cache/cacheTags";

// On-demand cache invalidation for data that is edited directly in MySQL
// (credit periods, policies, banners, ...). There's no admin role, so this is
// machine-to-machine: protected by REVALIDATE_SECRET in the
// `x-revalidate-secret` header rather than a user session.
//
// Body: { "tags": ["credit-periods", "banners"] }  or  { "tags": "all" }
//
// Note: Next's data cache lives on the local filesystem of each server
// process - if the app is ever run as multiple instances, call this against
// each one.

// Hash both sides first so timingSafeEqual always compares equal-length
// buffers (it throws otherwise, and an early length check would leak timing).
function secretMatches(provided, expected) {
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
  const expected = process.env.REVALIDATE_SECRET;

  // Never fall back to "no secret required" if the env var is missing
  if (!expected) {
    console.error("REVALIDATE_SECRET is not configured");
    return Response.json(
      { message: "Revalidation is not configured on this server" },
      { status: 503 },
    );
  }

  const provided = request.headers.get("x-revalidate-secret") || "";
  if (!secretMatches(provided, expected)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Request body must be JSON", validTags: VALID_CACHE_TAGS },
      { status: 400 },
    );
  }

  const tags = body?.tags === "all" ? VALID_CACHE_TAGS : body?.tags;

  if (!Array.isArray(tags) || tags.length === 0) {
    return Response.json(
      {
        message: 'Provide "tags" as a non-empty array, or "all"',
        validTags: VALID_CACHE_TAGS,
      },
      { status: 400 },
    );
  }

  const unknownTags = tags.filter((tag) => !VALID_CACHE_TAGS.includes(tag));
  if (unknownTags.length > 0) {
    return Response.json(
      {
        message: "Unknown cache tag(s)",
        unknownTags,
        validTags: VALID_CACHE_TAGS,
      },
      { status: 400 },
    );
  }

  const revalidated = [...new Set(tags)];
  revalidated.forEach((tag) => revalidateTag(tag));

  return Response.json(
    { revalidated, now: new Date().toISOString() },
    { status: 200 },
  );
}
