export const formatDateLong = (dateString) => {
  if (!dateString) return "dd/mm/yy";
  const date = new Date(dateString);
  if (isNaN(date)) return "n/a"; // invalid date check
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
