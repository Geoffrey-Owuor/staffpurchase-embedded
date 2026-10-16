// Helpers for putting user-typed text into the HTML email templates.

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Free-text (textarea) values: escaped so typed markup shows as text, with
// the typed line breaks kept as <br>. Many email clients ignore CSS
// white-space, so <br> is the reliable way to keep them.
export const multilineHtml = (value, fallback = "N/A") => {
  const text =
    typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : value;
  if (!text) return fallback;
  return escapeHtml(text).replace(/\n/g, "<br>");
};
