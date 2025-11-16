// Utility helpers for presenting rental data across admin views.
export const STEP_ORDER = [
  "pending",
  "confirmed",
  "ready_to_ship",
  "in_transit_to_user",
  "delivered",
  "active",
  "return_scheduled",
  "in_transit_to_owner",
  "returned",
  "completed",
];

export const STEP_LABELS = {
  pending: "Application",
  confirmed: "Confirmed",
  ready_to_ship: "Ready",
  in_transit_to_user: "To User",
  delivered: "Delivered",
  active: "Active",
  return_scheduled: "Return",
  in_transit_to_owner: "To Owner",
  returned: "Returned",
  completed: "Completed",
};

// Inclusive day count between two dates (counts both start and end dates).
export function inclusiveDays(startDateString, endDateString) {
  if (!startDateString || !endDateString) return 0;
  const start = new Date(startDateString);
  const end = new Date(endDateString);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diffDays = Math.floor((utcEnd - utcStart) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 ? diffDays + 1 : 0;
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getStatusColor(status) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "confirmed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "completed":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "cancelled":
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function getStatusText(status) {
  switch (status) {
    case "pending":
      return "Pending Review";
    case "confirmed":
      return "Confirmed";
    case "active":
      return "Active Rental";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "rejected":
      return "Rejected";
    default:
      return status || "Unknown";
  }
}

export function prettyShippingStatus(status) {
  if (!status) return "No Status";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
