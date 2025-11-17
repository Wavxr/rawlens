import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  Package,
  Truck,
  User,
} from "lucide-react";
import {
  STEP_LABELS,
  STEP_ORDER,
  formatDate,
  prettyShippingStatus,
} from "@utils/rentalFormatting";
import { getShippingBadgeClasses } from "@utils/deliveryFormatting";

// Presentational card summarising a rental's delivery progress and actions.
export function ShippingCard({
  rental,
  isHighlighted,
  registerCardRef,
  actionLoading,
  onReadyToShip,
  onTransitToUser,
  onConfirmReturned,
  onViewDetails,
  onManageRental,
  onNavigateToPayments,
  onConfirmReceived,
  onConfirmCustomerReturned,
  onMarkDelivered,
}) {
  const shippingStatus = rental.shipping_status || "none";
  const rentalStatus = rental.rental_status;
  const isTemporaryBooking = rental.booking_type === "temporary";

  const initialPayment = rental.payments?.find(
    (payment) => payment.payment_type === "rental" && !payment.extension_id
  );
  const paymentStatus = initialPayment?.payment_status;
  const isPaymentVerified = paymentStatus === "verified";
  const hasNotPaid = !paymentStatus || paymentStatus === "pending";
  const needsVerification = paymentStatus === "submitted";
  const paymentRejected = paymentStatus === "rejected";

  const canReadyToShip =
    rentalStatus === "confirmed" &&
    (shippingStatus === "none" || shippingStatus === "ready_to_ship");
  const canTransitToUser =
    rentalStatus === "confirmed" && shippingStatus === "ready_to_ship";
  const canConfirmReturned = shippingStatus === "in_transit_to_owner";

  const customerName =
    rental.customer_name ||
    (rental.users
      ? `${rental.users.first_name} ${rental.users.last_name}`.trim()
      : "") ||
    "Unknown Customer";

  const computeCurrentStepKey = (currentRental) => {
    const status = currentRental?.rental_status;
    const shipping = currentRental?.shipping_status;
    if (status === "completed" || shipping === "returned") return "completed";
    if (shipping === "in_transit_to_owner") return "in_transit_to_owner";
    if (shipping === "return_scheduled") return "return_scheduled";
    if (status === "active") return "active";
    if (shipping === "delivered") return "delivered";
    if (shipping === "in_transit_to_user") return "in_transit_to_user";
    if (shipping === "ready_to_ship") return "ready_to_ship";
    if (status === "confirmed") return "confirmed";
    return "pending";
  };

  const getProgressLabels = (currentRental) => {
    const stepKey = computeCurrentStepKey(currentRental);
    const index = Math.max(0, STEP_ORDER.indexOf(stepKey));
    const now = STEP_LABELS[STEP_ORDER[index]];
    const next = STEP_LABELS[STEP_ORDER[index + 1]];
    return { now, next };
  };

  const progressLabels = getProgressLabels(rental);
  const loadingKey = actionLoading[rental.id];

  return (
    <div
      ref={(element) => registerCardRef?.(String(rental.id), element)}
      className={`bg-gray-800 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
        isHighlighted
          ? "border-blue-500 shadow-lg ring-4 ring-blue-900/50"
          : "border-gray-700 hover:border-gray-600"
      } ${isTemporaryBooking ? "ring-2 ring-orange-600/30" : ""}`}
    >
      <div className="p-4 md:p-6">
        {isTemporaryBooking && (
          <div className="mb-3 px-3 py-2 bg-orange-900/20 border border-orange-700 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full" />
              <span className="text-orange-200 text-sm font-medium">
                Admin Managed (Instagram Customer)
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-white mb-1 truncate">
              {rental.cameras?.name || "Camera Equipment"}
              {rental.cameras?.serial_number && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  #{rental.cameras.serial_number}
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <User className="h-4 w-4" />
              <span className="truncate">{customerName}</span>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              <span className="mr-2">
                Now: <span className="text-gray-200">{progressLabels.now}</span>
              </span>
              {progressLabels.next && (
                <span>
                  Next: <span className="text-gray-300">{progressLabels.next}</span>
                </span>
              )}
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getShippingBadgeClasses(
              shippingStatus
            )}`}
          >
            {prettyShippingStatus(rental.shipping_status)}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-700 rounded-lg">
            <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
            <div className="min-w-0">
              <p className="text-sm md:text-lg font-semibold text-white truncate">
                ₱{rental.total_price?.toFixed(2) || "0.00"}
              </p>
              <p className="text-xs text-gray-300">Total Value</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-700 rounded-lg">
            <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-white truncate">
                {formatDate(rental.start_date)}
              </p>
              <p className="text-xs text-gray-300">Start Date</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-700 rounded-lg col-span-2 md:col-span-1">
            <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-white truncate">
                {formatDate(rental.end_date)}
              </p>
              <p className="text-xs text-gray-300">End Date</p>
            </div>
          </div>
        </div>

        {!isTemporaryBooking && !isPaymentVerified && (canReadyToShip || canTransitToUser) && (
          <div className="space-y-4 mb-4">
            {hasNotPaid && (
              <div className="bg-gray-700/50 border-2 border-gray-600 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-gray-200 font-semibold mb-1">
                      Awaiting Customer Payment
                    </h4>
                    <p className="text-gray-300 text-sm">
                      The customer has not submitted their payment receipt yet. You can proceed with shipping if you've received payment through other means.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {needsVerification && (
              <div className="bg-blue-900/20 border-2 border-blue-600 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-blue-200 font-semibold mb-1">
                      Payment Verification Recommended
                    </h4>
                    <p className="text-blue-100 text-sm mb-3">
                      The customer has submitted their payment receipt. Please verify the payment before shipping, or proceed if you've already confirmed payment.
                    </p>
                    <button
                      onClick={() => onNavigateToPayments?.(rental.id)}
                      className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span>Review Payment</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {!isTemporaryBooking && !isPaymentVerified && paymentRejected && (
          <div className="mb-4 bg-red-900/20 border-2 border-red-600 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-red-200 font-semibold mb-1">
                  Payment Receipt Rejected
                </h4>
                <p className="text-red-100 text-sm mb-3">
                  The payment receipt was rejected. The customer needs to resubmit. You can still proceed with shipping if you've received payment confirmation.
                </p>
                <button
                  onClick={() => onNavigateToPayments?.(rental.id)}
                  className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Review Payment</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 md:gap-3 items-center">
          {canReadyToShip && (
            <button
              onClick={() => onReadyToShip?.(rental.id)}
              disabled={loadingKey === "ready"}
              className="inline-flex items-center space-x-1 md:space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingKey === "ready" ? (
                <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
              ) : (
                <Package className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span>Mark Ready to Ship</span>
            </button>
          )}

          {canTransitToUser && (
            <button
              onClick={() => onTransitToUser?.(rental.id)}
              disabled={loadingKey === "outbound"}
              className="inline-flex items-center space-x-1 md:space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingKey === "outbound" ? (
                <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
              ) : (
                <Truck className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span>Ship to Customer</span>
            </button>
          )}

          {canConfirmReturned && (
            <button
              onClick={() => onConfirmReturned?.(rental.id)}
              disabled={loadingKey === "returned"}
              className="inline-flex items-center space-x-1 md:space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingKey === "returned" ? (
                <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span>Confirm Returned</span>
            </button>
          )}

          {isTemporaryBooking && (
            <>
              {rental.rental_status === "confirmed" && (
                <button
                  onClick={() => onConfirmReceived?.(rental.id)}
                  disabled={loadingKey === "received"}
                  className="inline-flex items-center space-x-1 md:space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingKey === "received" ? (
                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                  <span>Customer Received</span>
                </button>
              )}

              {rental.rental_status === "active" && (
                <button
                  onClick={() => onConfirmCustomerReturned?.(rental.id)}
                  disabled={loadingKey === "returned_proxy"}
                  className="inline-flex items-center space-x-1 md:space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingKey === "returned_proxy" ? (
                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  ) : (
                    <Package className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                  <span>Customer Returned</span>
                </button>
              )}

              {(rental.rental_status === "confirmed" || rental.rental_status === "active") && (
                <button
                  onClick={() => onMarkDelivered?.(rental.id)}
                  disabled={loadingKey === "delivered_proxy"}
                  className="inline-flex items-center space-x-1 md:space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingKey === "delivered_proxy" ? (
                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  ) : (
                    <Truck className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                  <span>Mark Delivered</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={() => onManageRental?.(rental)}
            className="inline-flex items-center space-x-1 md:space-x-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
          >
            <Truck className="h-3 w-3 md:h-4 md:w-4" />
            <span>Manage Rental</span>
          </button>

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
                {rental.rental_status === "active"
                  ? " - rental active"
                  : " - not yet active"}
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
            onClick={() => onViewDetails?.(rental)}
            className="inline-flex items-center space-x-1 md:space-x-2 text-gray-300 hover:text-white text-xs md:text-sm font-medium ml-auto"
          >
            <span>View Details</span>
            <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
