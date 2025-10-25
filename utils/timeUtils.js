// utils/timeUtils.js

/**
 * Converts a Date object or timestamp to relative time string
 * @param {Date | number} date - Date object or timestamp in milliseconds
 * @returns {string} e.g., "2h ago", "5m ago", "1d ago"
 */
export function timeSince(date) {
  if (!date) return "";

  // Ensure date is a Date object
  const past = date instanceof Date ? date : new Date(date);
  const seconds = Math.floor((new Date() - past) / 1000);

  let interval = Math.floor(seconds / 86400); // days
  if (interval >= 1) return interval + "d ago";

  interval = Math.floor(seconds / 3600); // hours
  if (interval >= 1) return interval + "h ago";

  interval = Math.floor(seconds / 60); // minutes
  if (interval >= 1) return interval + "m ago";

  return "Just now";
}
