import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import useRentalStore from "../../stores/rentalStore";
import { subscribeToAllRentals, unsubscribeFromChannel } from "../../services/realtimeService";
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  DollarSign,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import RentalStepper from "../../components/rental/RentalStepper";
import { adminReadyCamera, adminTransitToUser, adminConfirmReturned } from "../../services/deliveryService";
import { 
  adminConfirmReceived,
  adminConfirmReturned as adminConfirmReturnedBooking,
  adminMarkDelivered
} from "../../services/bookingService";
import { getUserById } from "../../services/userService";
import useAuthStore from "../../stores/useAuthStore";

const DELIVERY_FILTERS = [
  { key: "needs_action", label: "Needs Action" },
  { key: "outbound", label: "Outbound" },
  { key: "delivered", label: "Delivered" },
  { key: "returns", label: "Returns" },
  { key: "returned", label: "Returned" },
  { key: "none", label: "No Shipping" },
]

function getShippingBadgeClasses(status) {
  switch (status) {
    case "ready_to_ship":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "in_transit_to_user":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "delivered":
      return "bg-green-100 text-green-800 border-green-200"
    case "return_scheduled":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "in_transit_to_owner":
      return "bg-indigo-100 text-indigo-800 border-indigo-200"
    case "returned":
      return "bg-teal-100 text-teal-800 border-teal-200"
    default:
      return "bg-gray-100 text-gray-600 border-gray-200"
  }
}

function prettyShippingStatus(status) {
  if (!status) return "No Status"
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function getStatusText(status) {
  switch (status) {
    case "pending":
      return "Pending Review"
    case "confirmed":
      return "Confirmed"
    case "active":
      return "Active Rental"
    case "completed":
      return "Completed"
    case "cancelled":
      return "Cancelled"
    case "rejected":
      return "Rejected"
    default:
      return status || "Unknown"
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// Inclusive day count between two date strings (counts both start and end dates)
function inclusiveDays(startDateString, endDateString) {
  if (!startDateString || !endDateString) return 0;
  const s = new Date(startDateString);
  const e = new Date(endDateString);
  if (isNaN(s) || isNaN(e)) return 0;
  const utcStart = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
  const utcEnd = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
  const diff = Math.floor((utcEnd - utcStart) / (24 * 60 * 60 * 1000));
  return diff >= 0 ? diff + 1 : 0;
}

function doesRentalOverlapMonth(rental, monthString) {
  if (!monthString) return true; // No month filter, show all
  
  const rentalStart = new Date(rental.start_date);
  const rentalEnd = new Date(rental.end_date);
  const [year, month] = monthString.split('-').map(Number);
  const filterMonthStart = new Date(year, month - 1, 1); // month is 0-indexed
  const filterMonthEnd = new Date(year, month, 0); // Last day of the month
  
  // Check if rental overlaps with the selected month
  return rentalStart <= filterMonthEnd && rentalEnd >= filterMonthStart;
}

export default function Delivery() {
  const { user } = useAuthStore();
  const navigate = useNavigate(); // Initialize navigate
  const [searchParams] = useSearchParams();
  const { allRentals, loadAllRentals, loading } = useRentalStore();
  const [rentals, setRentals] = useState([]);
  const [actionLoading, setActionLoading] = useState({})
  const [filterCounts, setFilterCounts] = useState({
    needs_action: 0,
    outbound: 0,
    delivered: 0,
    returns: 0,
    returned: 0,
    none: 0
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedShippingFilter, setSelectedShippingFilter] = useState("needs_action")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return searchParams.get("month") || "";
  });
  const cardRefs = useRef({})
  const [highlightId, setHighlightId] = useState(null)
  const [selectedRental, setSelectedRental] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    loadAllRentals();
    const channel = subscribeToAllRentals();
    return () => {
      unsubscribeFromChannel(channel);
    };
  }, [loadAllRentals]);

  useEffect(() => {
    const rentalId = searchParams.get('rentalId')
    if (rentalId && allRentals.length > 0) {
      const targetRental = allRentals.find(r => String(r.id) === String(rentalId))
      if (targetRental) {
        const needsAdminAction = (r) =>
          (r.rental_status === "confirmed" && (!r.shipping_status || r.shipping_status === "ready_to_ship")) ||
          r.shipping_status === "in_transit_to_owner"
        let correctFilter = "needs_action"
        if (!needsAdminAction(targetRental)) {
          if (["ready_to_ship", "in_transit_to_user"].includes(targetRental.shipping_status)) {
            correctFilter = "outbound"
          } else if (["return_scheduled", "in_transit_to_owner"].includes(targetRental.shipping_status)) {
            correctFilter = "returns"
          } else if (targetRental.shipping_status === "delivered") {
            correctFilter = "delivered"
          } else if (targetRental.shipping_status === "returned") {
            correctFilter = "returned"
          } else if (!targetRental.shipping_status) {
            correctFilter = "none"
          }
        }
        setSelectedShippingFilter(correctFilter)
        setHighlightId(rentalId)
        setTimeout(() => {
          const cardElement = cardRefs.current[String(rentalId)]
          if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
        setTimeout(() => {
          setHighlightId(null)
        }, 3000)
      }
    }
  }, [searchParams, allRentals])

  const handleViewDetails = async (rental) => {
    setSelectedRental(rental)
    try {
      const userData = await getUserById(rental.user_id)
      setSelectedUser(userData)
    } catch {
      toast.error("Failed to load user details. Please try again.");
      setSelectedUser(null)
    }
  }

  const calculateFilterCounts = useCallback((rentals) => {
    const counts = {
      needs_action: 0,
      outbound: 0,
      delivered: 0,
      returns: 0,
      returned: 0,
      none: 0
    }
    const needsAdminAction = (r) =>
      (r.rental_status === "confirmed" && (!r.shipping_status || r.shipping_status === "ready_to_ship")) ||
      r.shipping_status === "in_transit_to_owner"
    
    // First apply month filter if selected
    let filteredRentals = rentals;
    if (selectedMonth) {
      filteredRentals = rentals.filter((rental) => doesRentalOverlapMonth(rental, selectedMonth));
    }
    
    filteredRentals.forEach(rental => {
      if (needsAdminAction(rental)) {
        counts.needs_action++
      } else if (["ready_to_ship", "in_transit_to_user"].includes(rental.shipping_status)) {
        counts.outbound++
      } else if (rental.shipping_status === "delivered") {
        counts.delivered++
      } else if (["return_scheduled", "in_transit_to_owner"].includes(rental.shipping_status)) {
        counts.returns++
      } else if (rental.shipping_status === "returned") {
        counts.returned++
      } else if (!rental.shipping_status) {
        counts.none++
      }
    })
    return counts
  }, [selectedMonth])

  useEffect(() => {
    if (allRentals.length > 0) {
      const counts = calculateFilterCounts(allRentals)
      setFilterCounts(counts)
    }
    let filtered = allRentals
    const needsAdminAction = (r) =>
      (r.rental_status === "confirmed" && (!r.shipping_status || r.shipping_status === "ready_to_ship")) ||
      r.shipping_status === "in_transit_to_owner"
    switch (selectedShippingFilter) {
      case "needs_action":
        filtered = filtered.filter(needsAdminAction)
        break
      case "outbound":
        filtered = filtered.filter((r) => ["ready_to_ship", "in_transit_to_user"].includes(r.shipping_status))
        break
      case "returns":
        filtered = filtered.filter((r) => ["return_scheduled", "in_transit_to_owner"].includes(r.shipping_status))
        break
      case "delivered":
      case "returned":
        filtered = filtered.filter((r) => r.shipping_status === selectedShippingFilter)
        break
      case "none":
        filtered = filtered.filter((r) => !r.shipping_status)
        break
      default:
        break
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter((r) => {
        const fullName = `${r.users?.first_name || ""} ${r.users?.last_name || ""}`.toLowerCase()
        return (
          fullName.includes(q) ||
          r.users?.email?.toLowerCase().includes(q) ||
          r.cameras?.name?.toLowerCase().includes(q)
        )
      })
    }

    // Apply month filter
    if (selectedMonth) {
      filtered = filtered.filter((rental) => 
        doesRentalOverlapMonth(rental, selectedMonth)
      );
    }

    setRentals(filtered)
  }, [allRentals, selectedShippingFilter, searchTerm, selectedMonth, calculateFilterCounts])

  const setBusy = (id, action) => setActionLoading((prev) => ({ ...prev, [id]: action }))
  const clearBusy = (id) =>
    setActionLoading((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    const newParams = new URLSearchParams(searchParams);
    if (month) {
      newParams.set("month", month);
    } else {
      newParams.delete("month");
    }
    // Update URL without triggering navigation
    window.history.replaceState(null, '', `${window.location.pathname}?${newParams}`);
  };

  // Helpers to navigate months with arrow buttons
  const monthStringFromDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const handlePrevMonth = () => {
    let base;
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      base = new Date(y, m - 1, 1);
    } else {
      base = new Date();
    }
    const prev = new Date(base.getFullYear(), base.getMonth() - 1, 1);
    handleMonthChange(monthStringFromDate(prev));
  };

  const handleNextMonth = () => {
    let base;
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      base = new Date(y, m - 1, 1);
    } else {
      base = new Date();
    }
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    handleMonthChange(monthStringFromDate(next));
  };

  // Generate month options for the current and next 12 months
  const getMonthOptions = () => {
    const options = [{ value: "", label: "All Months" }];
    const currentDate = new Date();
    
    for (let i = -6; i <= 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options;
  };

  const handleReadyToShip = async (rentalId) => {
    setBusy(rentalId, "ready")
    try {
      const result = await adminReadyCamera(rentalId, user.id);
      if (!result.success) {
        toast.error(`Failed to mark ready to ship: ${result.error}`);
        return;
      }
      toast.success("Item marked as ready to ship!");
    } catch {
      toast.error("Failed to update shipping status. Please try again.");
    } finally {
      clearBusy(rentalId)
    }
  }

  const handleTransitToUser = async (rentalId) => {
    setBusy(rentalId, "outbound")
    try {
      const result = await adminTransitToUser(rentalId, user.id);
      if (!result.success) {
        toast.error(`Failed to mark in transit: ${result.error}`);
        return;
      }
      toast.success("Item marked as in transit to customer!");
    } catch {
      toast.error("Failed to update shipping status. Please try again.");
    } finally {
      clearBusy(rentalId)
    }
  }

  const handleConfirmReturned = async (rentalId) => {
    setBusy(rentalId, "returned")
    try {
      const result = await adminConfirmReturned(rentalId, user.id);
      if (!result.success) {
        toast.error(`Failed to confirm return: ${result.error}`);
        return;
      }
      toast.success("Item return confirmed successfully! Rental completed.");
    } catch {
      toast.error("Failed to confirm return. Please try again.");
    } finally {
      clearBusy(rentalId);
    }
  }

  const ShippingCard = ({ rental }) => {
    const shippingStatus = rental.shipping_status || "none"
    const rentalStatus = rental.rental_status
    const STEP_ORDER = [
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
    ]
    const STEP_LABELS = {
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
    }
    function computeNowKey(r) {
      const rs = r?.rental_status
      const ss = r?.shipping_status
      if (rs === "completed" || ss === "returned") return "completed"
      if (ss === "in_transit_to_owner") return "in_transit_to_owner"
      if (ss === "return_scheduled") return "return_scheduled"
      if (rs === "active") return "active"
      if (ss === "delivered") return "delivered"
      if (ss === "in_transit_to_user") return "in_transit_to_user"
      if (ss === "ready_to_ship") return "ready_to_ship"
      if (rs === "confirmed") return "confirmed"
      return "pending"
    }
    function getNowNextLabels(r) {
      const nowKey = computeNowKey(r)
      const idx = Math.max(0, STEP_ORDER.indexOf(nowKey))
      const now = STEP_LABELS[STEP_ORDER[idx]]
      const next = STEP_LABELS[STEP_ORDER[idx + 1]]
      return { now, next }
    }
    const canReadyToShip =
      rentalStatus === "confirmed" && (shippingStatus === "none" || shippingStatus === "ready_to_ship")
    const canTransitToUser = rentalStatus === "confirmed" && shippingStatus === "ready_to_ship"
    const canConfirmReturned = shippingStatus === "in_transit_to_owner"
    
    const isTemporaryBooking = rental.booking_type === 'temporary';
    const customerName = rental.customer_name || 
                        (rental.users ? `${rental.users.first_name} ${rental.users.last_name}`.trim() : '') ||
                        'Unknown Customer';
    
    return (
      <div
        ref={(el) => {
          cardRefs.current[String(rental.id)] = el
        }}
        className={`
          bg-gray-800 rounded-xl border-2 transition-all duration-200 hover:shadow-lg
          ${
            String(highlightId) === String(rental.id)
              ? "border-blue-500 shadow-lg ring-4 ring-blue-900/50"
              : "border-gray-700 hover:border-gray-600"
          }
          ${isTemporaryBooking ? 'ring-2 ring-orange-600/30' : ''}
        `}
      >
        <div className="p-4 md:p-6">
          {isTemporaryBooking && (
            <div className="mb-3 px-3 py-2 bg-orange-900/20 border border-orange-700 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span className="text-orange-200 text-sm font-medium">Admin Managed (Instagram Customer)</span>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-1">
                {rental.cameras?.name || "Camera Equipment"}
                {rental.cameras?.serial_number && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    #{rental.cameras.serial_number}
                  </span>
                )}
              </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
                <User className="h-4 w-4" />
                <span>{customerName}</span>
              </div>
            {(() => {
              const { now, next } = getNowNextLabels(rental)
              return (
                <div className="mt-1 text-xs text-gray-400">
                  <span className="mr-2">Now: <span className="text-gray-200">{now}</span></span>
                  {next && <span>Next: <span className="text-gray-300">{next}</span></span>}
                </div>
              )
            })()}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getShippingBadgeClasses(shippingStatus)}`}
            >
              {prettyShippingStatus(rental.shipping_status)}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
            <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-700 rounded-lg">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
              <div className="min-w-0">
                <p className="text-sm md:text-lg font-semibold text-white truncate">₱{rental.total_price?.toFixed(2) || "0.00"}</p>
                <p className="text-xs text-gray-300">Total Value</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-700 rounded-lg">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-white truncate">{formatDate(rental.start_date)}</p>
                <p className="text-xs text-gray-300">Start Date</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-700 rounded-lg col-span-2 md:col-span-1">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-white truncate">{formatDate(rental.end_date)}</p>
                <p className="text-xs text-gray-300">End Date</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3 items-center">
            {canReadyToShip && (
              <button
                onClick={() => handleReadyToShip(rental.id)}
                disabled={actionLoading[rental.id] === "ready"}
                className="inline-flex items-center space-x-1 md:space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading[rental.id] === "ready" ? (
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                ) : (
                  <Package className="h-3 w-3 md:h-4 md:w-4" />
                )}
                <span>Mark Ready to Ship</span>
              </button>
            )}
            {canTransitToUser && (
              <button
                onClick={() => handleTransitToUser(rental.id)}
                disabled={actionLoading[rental.id] === "outbound"}
                className="inline-flex items-center space-x-1 md:space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading[rental.id] === "outbound" ? (
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                ) : (
                  <Truck className="h-3 w-3 md:h-4 md:w-4" />
                )}
                <span>Ship to Customer</span>
              </button>
            )}
            {canConfirmReturned && (
              <button
                onClick={() => handleConfirmReturned(rental.id)}
                disabled={actionLoading[rental.id] === "returned"}
                className="inline-flex items-center space-x-1 md:space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading[rental.id] === "returned" ? (
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                )}
                <span>Confirm Returned</span>
              </button>
            )}
            
            {/* Admin Proxy Actions for Temporary Bookings */}
            {isTemporaryBooking && (
              <>
                {rental.rental_status === 'confirmed' && (
                  <button
                    onClick={async () => {
                      setActionLoading((prev) => ({ ...prev, [rental.id]: "received" }));
                      try {
                        const result = await adminConfirmReceived(rental.id);
                        if (result.success) {
                          toast.success("Customer receipt confirmed!");
                        } else {
                          toast.error(`Failed to confirm receipt: ${result.error}`);
                        }
                      } catch {
                        toast.error("Failed to confirm receipt");
                      } finally {
                        setActionLoading((prev) => {
                          const newLoading = { ...prev };
                          delete newLoading[rental.id];
                          return newLoading;
                        });
                      }
                    }}
                    disabled={actionLoading[rental.id] === "received"}
                    className="inline-flex items-center space-x-1 md:space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading[rental.id] === "received" ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                    <span>Customer Received</span>
                  </button>
                )}
                
                {rental.rental_status === 'active' && (
                  <button
                    onClick={async () => {
                      setActionLoading((prev) => ({ ...prev, [rental.id]: "returned_proxy" }));
                      try {
                        const result = await adminConfirmReturnedBooking(rental.id);
                        if (result.success) {
                          toast.success("Customer return confirmed!");
                        } else {
                          toast.error(`Failed to confirm return: ${result.error}`);
                        }
                      } catch {
                        toast.error("Failed to confirm return");
                      } finally {
                        setActionLoading((prev) => {
                          const newLoading = { ...prev };
                          delete newLoading[rental.id];
                          return newLoading;
                        });
                      }
                    }}
                    disabled={actionLoading[rental.id] === "returned_proxy"}
                    className="inline-flex items-center space-x-1 md:space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading[rental.id] === "returned_proxy" ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <Package className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                    <span>Customer Returned</span>
                  </button>
                )}
                
                {(rental.rental_status === 'confirmed' || rental.rental_status === 'active') && (
                  <button
                    onClick={async () => {
                      setActionLoading((prev) => ({ ...prev, [rental.id]: "delivered_proxy" }));
                      try {
                        const result = await adminMarkDelivered(rental.id);
                        if (result.success) {
                          toast.success("Marked as delivered!");
                        } else {
                          toast.error(`Failed to mark as delivered: ${result.error}`);
                        }
                      } catch {
                        toast.error("Failed to mark as delivered");
                      } finally {
                        setActionLoading((prev) => {
                          const newLoading = { ...prev };
                          delete newLoading[rental.id];
                          return newLoading;
                        });
                      }
                    }}
                    disabled={actionLoading[rental.id] === "delivered_proxy"}
                    className="inline-flex items-center space-x-1 md:space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading[rental.id] === "delivered_proxy" ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <Truck className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                    <span>Mark Delivered</span>
                  </button>
                )}
              </>
            )}
            
            {/* --- Added Manage Rental Button to ShippingCard --- */}
            <button
              onClick={(e) => {
                 e.stopPropagation();
                 // Determine the best status filter for the rental page
                 const statusToFilter = ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected'].includes(rental?.rental_status) ? rental.rental_status : 'needs_action';
                 navigate(`/admin/rentals?status=${statusToFilter}&highlightId=${rental.id}`);
              }}
              className="inline-flex items-center space-x-1 md:space-x-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
            >
              <Truck className="h-3 w-3 md:h-4 md:w-4" />
              <span>Manage Rental</span>
            </button>
            {/* --- End Added Button --- */}

            {/* Status Messages */}
            {shippingStatus === "in_transit_to_user" && (
              <div className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm text-blue-400 bg-blue-900/30 px-2 md:px-3 py-2 rounded-lg">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                <span>Awaiting customer delivery confirmation</span>
              </div>
            )}
            {shippingStatus === "delivered" && (
              <div className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm text-green-400 bg-green-900/30 px-2 md:px-3 py-2 rounded-lg">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span>
                  Equipment delivered
                  {rental.rental_status === "active" ? " - rental active" : " - not yet active"}
                </span>
              </div>
            )}
            {shippingStatus === "return_scheduled" && (
              <div className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm text-purple-400 bg-purple-900/30 px-2 md:px-3 py-2 rounded-lg">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                <span>Return scheduled - awaiting pickup</span>
              </div>
            )}
            <button
              onClick={() => handleViewDetails(rental)}
              className="inline-flex items-center space-x-1 md:space-x-2 text-gray-300 hover:text-white text-xs md:text-sm font-medium ml-auto"
            >
              <span>View Details</span>
              <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading delivery management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover
        theme="light"
        />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Delivery Management</h1>
          <p className="text-gray-300">Track equipment logistics and manage shipping workflows efficiently.</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by customer name, email, or equipment..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="lg:w-64 flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous month"
                className="p-2 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                {getMonthOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next month"
                className="p-2 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {DELIVERY_FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedShippingFilter(filter.key)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200
                  flex items-center gap-2
                  ${
                    selectedShippingFilter === filter.key
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:shadow-sm"
                  }
                `}
              >
                <span>{filter.label}</span>
                <span 
                  className={`inline-flex items-center justify-center min-w-5 h-5 rounded-full text-xs font-medium ${
                    selectedShippingFilter === filter.key 
                      ? 'bg-white/20' 
                      : 'bg-gray-600/50 text-gray-200'
                  }`}
                >
                  {filterCounts[filter.key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
        {rentals.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No deliveries found</h3>
            <p className="text-gray-300">
              {searchTerm
                ? "No deliveries match your search criteria. Try adjusting your filters."
                : "There are no deliveries with the selected status at this time."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rentals.map((rental) => (
              <ShippingCard key={rental.id} rental={rental} />
            ))}
          </div>
        )}
        {selectedRental && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => { setSelectedRental(null); setSelectedUser(null); }}
          >
            <div
              className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 md:p-6">
                {/* Updated modal header with Manage Rental button */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Delivery Details</h2>
                    <p className="text-gray-300 mt-1">
                      {selectedRental.cameras?.name || "Camera Equipment"}
                      {selectedRental.cameras?.serial_number && (
                        <span className="ml-2 text-sm text-gray-400">
                          #{selectedRental.cameras.serial_number}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Added Manage Rental button */}
                    <button
                      onClick={() => {
                        const statusToFilter = ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected'].includes(selectedRental?.rental_status) ? selectedRental.rental_status : 'needs_action';
                        navigate(`/admin/rentals?status=${statusToFilter}&highlightId=${selectedRental.id}`);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Truck className="mr-1.5 h-4 w-4" />
                      Manage Rental
                    </button>
                    <button
                      onClick={() => { setSelectedRental(null); setSelectedUser(null); }}
                      className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="mb-6">
                  <RentalStepper rental={selectedRental} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Customer Information</h3>
                    {selectedRental?.booking_type === 'temporary' && (
                      <div className="mb-3 px-3 py-2 bg-orange-900/20 border border-orange-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span className="text-orange-200 text-sm font-medium">Admin Managed (Instagram Customer)</span>
                        </div>
                      </div>
                    )}
                    <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-white">
                            {selectedRental?.customer_name || 
                             (selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}`.trim() : '') ||
                             'Unknown Customer'}
                          </p>
                          <p className="text-sm text-gray-300">
                            {selectedRental?.customer_email || selectedUser?.email || 'No email'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-600">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Phone</p>
                          <p className="text-sm text-white">
                            {selectedRental?.customer_contact || selectedUser?.contact_number || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Address</p>
                          <p className="text-sm text-white">
                            {selectedUser?.address ? (
                              <>
                                {selectedUser.address}
                                {selectedUser.city && `, ${selectedUser.city}`}
                                {selectedUser.state && `, ${selectedUser.state}`}
                                {selectedUser.postal_code && ` ${selectedUser.postal_code}`}
                              </>
                            ) : (
                              "Not provided"
                            )}
                          </p>
                        </div>
                      </div>
                      {selectedUser?.emergency_contact && (
                        <div className="pt-3 border-t border-gray-600">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Emergency Contact</p>
                          <div className="bg-gray-600 rounded p-3">
                            <p className="text-sm text-white font-medium">{selectedUser.emergency_contact.name}</p>
                            <p className="text-sm text-gray-300">{selectedUser.emergency_contact.phone}</p>
                            <p className="text-sm text-gray-300">{selectedUser.emergency_contact.relationship}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Rental & Equipment</h3>
                  <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Rental Status: {getStatusText(selectedRental?.rental_status)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Shipping Status: {prettyShippingStatus(selectedRental?.shipping_status)}</span>
                      </div>
                    </div>
                      <div className="pt-3 border-t border-gray-600">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Equipment</p>
                            <p className="text-sm font-medium text-white">
                              {selectedRental.cameras?.name || "Camera Equipment"}
                              {selectedRental.cameras?.serial_number && (
                                <span className="ml-2 text-xs text-gray-400">
                                  #{selectedRental.cameras.serial_number}
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Price</p>
                            <p className="text-sm font-medium text-white">₱{selectedRental.total_price?.toFixed(2) || "0.00"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Start Date</p>
                            <p className="text-sm font-medium text-white">{formatDate(selectedRental.start_date)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">End Date</p>
                            <p className="text-sm font-medium text-white">{formatDate(selectedRental.end_date)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Duration</p>
                            <p className="text-sm font-medium text-white">
                              {inclusiveDays(selectedRental.start_date, selectedRental.end_date)} days
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
