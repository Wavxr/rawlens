import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Clock, DollarSign, Loader2, Search, Truck, User, X } from "lucide-react";
import { ShippingCard } from "../../components/admin/delivery/ShippingCard";
import { useDeliveryFilters, DELIVERY_FILTERS } from "../../hooks/useDeliveryFilters";
import { useActionLoadingMap } from "../../hooks/useActionLoadingMap";
import { subscribeToAllRentals, unsubscribeFromChannel } from "../../services/realtimeService";
import { adminReadyCamera, adminTransitToUser, adminConfirmReturned } from "../../services/deliveryService";
import { adminConfirmReceived, adminConfirmReturned as adminConfirmReturnedBooking, adminMarkDelivered } from "../../services/bookingService";
import { getUserById } from "../../services/userService";
import { inclusiveDays, formatDate, getStatusText, prettyShippingStatus } from "../../utils/rentalFormatting";
import RentalStepper from "../../components/rental/RentalStepper";
import useRentalStore from "../../stores/rentalStore";
import useAuthStore from "../../stores/useAuthStore";

export default function Delivery() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { allRentals, loadAllRentals, loading } = useRentalStore();
  const { actionLoading, runWithLoading } = useActionLoadingMap();
  const {
    rentals,
    searchTerm,
    setSearchTerm,
    selectedFilter,
    handleFilterChange,
    selectedMonth,
    handleMonthChange,
    handlePrevMonth,
    handleNextMonth,
    monthOptions,
    filterCounts,
    highlightId,
    highlightRental,
    setHighlightParam,
  } = useDeliveryFilters({ allRentals, searchParams, setSearchParams });
  const cardRefs = useRef({});
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadAllRentals();
    const channel = subscribeToAllRentals();
    return () => {
      unsubscribeFromChannel(channel);
    };
  }, [loadAllRentals]);

  const registerCardRef = useCallback((id, node) => {
    if (node) {
      cardRefs.current[id] = node;
    } else {
      delete cardRefs.current[id];
    }
  }, []);

  useEffect(() => {
    if (!highlightId || !highlightRental) return;
    const card = cardRefs.current[String(highlightId)];
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const timeoutId = window.setTimeout(() => setHighlightParam(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [highlightId, highlightRental, setHighlightParam]);

  const ensureAdmin = useCallback(() => {
    if (!user?.id) {
      console.error("You must be signed in to manage deliveries.");
      return null;
    }
    return user.id;
  }, [user]);

  const handleReadyToShip = useCallback(
    (rentalId) =>
      runWithLoading(rentalId, "ready", async () => {
        const adminId = ensureAdmin();
        if (!adminId) return;
        try {
          const result = await adminReadyCamera(rentalId, adminId);
          if (!result.success) {
            console.error(`Failed to mark ready to ship: ${result.error}`);
            return;
          }
          console.info("Item marked as ready to ship", rentalId);
        } catch (error) {
          console.error("Failed to update shipping status", error);
        }
      }),
    [ensureAdmin, runWithLoading]
  );

  const handleTransitToUser = useCallback(
    (rentalId) =>
      runWithLoading(rentalId, "outbound", async () => {
        const adminId = ensureAdmin();
        if (!adminId) return;
        try {
          const result = await adminTransitToUser(rentalId, adminId);
          if (!result.success) {
            console.error(`Failed to mark in transit: ${result.error}`);
            return;
          }
          console.info("Item marked as in transit", rentalId);
        } catch (error) {
          console.error("Failed to update shipping status", error);
        }
      }),
    [ensureAdmin, runWithLoading]
  );

  const handleConfirmReturned = useCallback(
    (rentalId) =>
      runWithLoading(rentalId, "returned", async () => {
        const adminId = ensureAdmin();
        if (!adminId) return;
        try {
          const result = await adminConfirmReturned(rentalId, adminId);
          if (!result.success) {
            console.error(`Failed to confirm return: ${result.error}`);
            return;
          }
          console.info("Item return confirmed", rentalId);
        } catch (error) {
          console.error("Failed to confirm return", error);
        }
      }),
    [ensureAdmin, runWithLoading]
  );

  const handleConfirmReceivedProxy = useCallback(
    (rentalId) =>
      runWithLoading(rentalId, "received", async () => {
        try {
          const result = await adminConfirmReceived(rentalId);
          if (result.success) {
            console.info("Customer receipt confirmed", rentalId);
          } else {
            console.error(`Failed to confirm receipt: ${result.error}`);
          }
        } catch (error) {
          console.error("Failed to confirm receipt", error);
        }
      }),
    [runWithLoading]
  );

  const handleConfirmCustomerReturned = useCallback(
    (rentalId) =>
      runWithLoading(rentalId, "returned_proxy", async () => {
        try {
          const result = await adminConfirmReturnedBooking(rentalId);
          if (result.success) {
            console.info("Customer return confirmed", rentalId);
          } else {
            console.error(`Failed to confirm return: ${result.error}`);
          }
        } catch (error) {
          console.error("Failed to confirm return", error);
        }
      }),
    [runWithLoading]
  );

  const handleMarkDelivered = useCallback(
    (rentalId) =>
      runWithLoading(rentalId, "delivered_proxy", async () => {
        try {
          const result = await adminMarkDelivered(rentalId);
          if (result.success) {
            console.info("Marked rental as delivered", rentalId);
          } else {
            console.error(`Failed to mark as delivered: ${result.error}`);
          }
        } catch (error) {
          console.error("Failed to mark as delivered", error);
        }
      }),
    [runWithLoading]
  );

  const handleNavigateToPayments = useCallback(
    (rentalId) => {
      navigate(`/admin/payments?highlightId=${rentalId}`);
    },
    [navigate]
  );

  const handleManageRental = useCallback(
    (rental) => {
      if (!rental) return;
      const allowedStatuses = ["pending", "confirmed", "active", "completed", "cancelled", "rejected"];
      const statusToFilter = allowedStatuses.includes(rental.rental_status)
        ? rental.rental_status
        : "needs_action";
      navigate(`/admin/rentals?status=${statusToFilter}&highlightId=${rental.id}`);
    },
    [navigate]
  );

  const handleViewDetails = useCallback(async (rental) => {
    setSelectedRental(rental);
    try {
      const userData = await getUserById(rental.user_id);
      setSelectedUser(userData);
    } catch (error) {
      console.error("Failed to load user details", error);
      setSelectedUser(null);
    }
  }, []);

  const handleCloseModal = () => {
    setSelectedRental(null);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading delivery management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
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
                  onChange={(event) => setSearchTerm(event.target.value)}
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
                onChange={(event) => handleMonthChange(event.target.value)}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                {monthOptions.map((option) => (
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
                onClick={() => handleFilterChange(filter.key)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200
                  flex items-center gap-2
                  ${
                    selectedFilter === filter.key
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:shadow-sm"
                  }
                `}
              >
                <span>{filter.label}</span>
                <span 
                  className={`inline-flex items-center justify-center min-w-5 h-5 rounded-full text-xs font-medium ${
                    selectedFilter === filter.key 
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
              <ShippingCard
                key={rental.id}
                rental={rental}
                isHighlighted={String(highlightId) === String(rental.id)}
                registerCardRef={registerCardRef}
                actionLoading={actionLoading}
                onReadyToShip={handleReadyToShip}
                onTransitToUser={handleTransitToUser}
                onConfirmReturned={handleConfirmReturned}
                onConfirmReceived={handleConfirmReceivedProxy}
                onConfirmCustomerReturned={handleConfirmCustomerReturned}
                onMarkDelivered={handleMarkDelivered}
                onManageRental={handleManageRental}
                onNavigateToPayments={handleNavigateToPayments}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
        {selectedRental && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={handleCloseModal}
          >
            <div
              className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(event) => event.stopPropagation()}
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
                      onClick={() => handleManageRental(selectedRental)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Truck className="mr-1.5 h-4 w-4" />
                      Manage Rental
                    </button>
                    <button
                      onClick={handleCloseModal}
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
                  
                  {/* Payment Status Section */}
                  {(() => {
                    const initialPayment = selectedRental?.payments?.find(p => p.payment_type === 'rental' && !p.extension_id);
                    const paymentStatus = initialPayment?.payment_status;
                    const isTemporaryBooking = selectedRental?.booking_type === 'temporary';
                    
                    if (!isTemporaryBooking) {
                      let bgColor, borderColor, textColor, iconColor, btnBg, btnHover;
                      let statusText = 'Unknown';
                      let statusIcon = AlertCircle;
                      
                      switch (paymentStatus) {
                        case 'verified':
                          bgColor = 'bg-green-900/20';
                          borderColor = 'border-green-600';
                          textColor = 'text-green-200';
                          iconColor = 'text-green-400';
                          statusText = 'Verified ✓';
                          statusIcon = CheckCircle;
                          break;
                        case 'submitted':
                          bgColor = 'bg-blue-900/20';
                          borderColor = 'border-blue-600';
                          textColor = 'text-blue-200';
                          iconColor = 'text-blue-400';
                          btnBg = 'bg-blue-600';
                          btnHover = 'hover:bg-blue-700';
                          statusText = 'Under Review';
                          statusIcon = Clock;
                          break;
                        case 'pending':
                          bgColor = 'bg-amber-900/20';
                          borderColor = 'border-amber-600';
                          textColor = 'text-amber-200';
                          iconColor = 'text-amber-400';
                          btnBg = 'bg-amber-600';
                          btnHover = 'hover:bg-amber-700';
                          statusText = 'Pending';
                          statusIcon = Clock;
                          break;
                        case 'rejected':
                          bgColor = 'bg-red-900/20';
                          borderColor = 'border-red-600';
                          textColor = 'text-red-200';
                          iconColor = 'text-red-400';
                          btnBg = 'bg-red-600';
                          btnHover = 'hover:bg-red-700';
                          statusText = 'Rejected';
                          statusIcon = X;
                          break;
                        default:
                          bgColor = 'bg-gray-700/20';
                          borderColor = 'border-gray-600';
                          textColor = 'text-gray-200';
                          iconColor = 'text-gray-400';
                          btnBg = 'bg-gray-600';
                          btnHover = 'hover:bg-gray-700';
                          statusText = 'No Payment';
                          statusIcon = AlertCircle;
                      }
                      
                      const StatusIcon = statusIcon;
                      
                      return (
                        <div className={`${bgColor} border-2 ${borderColor} rounded-lg p-4 mb-4`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <StatusIcon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                              <div>
                                <h4 className={`${textColor} font-semibold mb-1`}>
                                  Payment Status: {statusText}
                                </h4>
                                {paymentStatus !== 'verified' && (
                                  <p className={`${textColor} text-sm opacity-90`}>
                                    Delivery cannot proceed until payment is verified.
                                  </p>
                                )}
                              </div>
                            </div>
                            {paymentStatus !== 'verified' && (
                              <button
                                onClick={() => handleNavigateToPayments(selectedRental.id)}
                                className={`inline-flex items-center space-x-1 ${btnBg} ${btnHover} text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors`}
                              >
                                <DollarSign className="h-4 w-4" />
                                <span>Review</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
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
