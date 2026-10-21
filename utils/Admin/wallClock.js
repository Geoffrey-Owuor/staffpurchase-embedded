// Admin start/end values are DB wall-clock strings ("YYYY-MM-DDTHH:mm", see
// lib/adminForm.js). Built with the local Date constructor so the shown
// time is exactly the stored one, whatever the browser's timezone.
export function formatWallClock(value) {
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
