export const DELIVERY_FILTERS = [
  { key: "needs_action", label: "Needs Action" },
  { key: "outbound", label: "Outbound" },
  { key: "delivered", label: "Delivered" },
  { key: "returns", label: "Returns" },
  { key: "returned", label: "Returned" },
  { key: "none", label: "No Shipping" },
];

export function needsAdminDeliveryAction(rental) {
  return (
    rental.rental_status === "confirmed" &&
    (!rental.shipping_status || rental.shipping_status === "ready_to_ship")
  ) || rental.shipping_status === "in_transit_to_owner";
}

export function getDeliveryFilterKey(rental) {
  if (needsAdminDeliveryAction(rental)) return "needs_action";
  if (["ready_to_ship", "in_transit_to_user"].includes(rental.shipping_status)) return "outbound";
  if (["return_scheduled", "in_transit_to_owner"].includes(rental.shipping_status)) return "returns";
  if (rental.shipping_status === "delivered") return "delivered";
  if (rental.shipping_status === "returned") return "returned";
  return rental.shipping_status ? "none" : "none";
}

export function includeRentalByDeliveryFilter(rental, filterKey) {
  switch (filterKey) {
    case "needs_action":
      return needsAdminDeliveryAction(rental);
    case "outbound":
      return ["ready_to_ship", "in_transit_to_user"].includes(rental.shipping_status);
    case "returns":
      return ["return_scheduled", "in_transit_to_owner"].includes(rental.shipping_status);
    case "delivered":
      return rental.shipping_status === "delivered";
    case "returned":
      return rental.shipping_status === "returned";
    case "none":
      return !rental.shipping_status;
    default:
      return true;
  }
}

export function getShippingBadgeClasses(status) {
  switch (status) {
    case "ready_to_ship":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "in_transit_to_user":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "delivered":
      return "bg-green-100 text-green-800 border-green-200";
    case "return_scheduled":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "in_transit_to_owner":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "returned":
      return "bg-teal-100 text-teal-800 border-teal-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}
