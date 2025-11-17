import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Loader2,
  Receipt,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import { PaymentStatusBadge } from "@components/admin/payment/PaymentVerificationComponents";
import {
  formatDate,
  getStatusColor,
  getStatusText,
  inclusiveDays,
} from "@utils/rentalFormatting";

// Displays a single rental card with all admin actions.
export function RentalCard({
  rental,
  isHighlighted,
  registerCardRef,
  actionLoading,
  contractViewLoading,
  contractViewError,
  onApprove,
  onReject,
  onStart,
  onManageLogistics,
  onViewContract,
  onViewDetails,
  onDelete,
  onOpenPaymentVerification,
  onViewPaymentReceipt,
  onRemoveCancelled,
  onConfirmReceived,
  onConfirmReturned,
  onMarkDelivered,
}) {
  const loadingKey = actionLoading[rental.id];
  const contractLoading = contractViewLoading[rental.id];
  const contractError = contractViewError[rental.id];

  const isTemporaryBooking = rental.booking_type === "temporary";
  const customerName =
    rental.customer_name ||
    (rental.users
      ? `${rental.users.first_name} ${rental.users.last_name}`.trim()
      : "") ||
    "Unknown Customer";
  const customerEmail = rental.customer_email || rental.users?.email || "No email";

  const initialPayment = rental.payments?.find(
    (payment) => payment.payment_type === "rental" && !payment.extension_id
  );

  const rejectionExpiryDate = rental.rejection_expires_at
    ? new Date(rental.rejection_expires_at)
    : null;
  const rejectionCountdownDays = rejectionExpiryDate
    ? Math.max(
        0,
        Math.ceil((rejectionExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null;

  const handleCardRef = (element) => {
    if (!registerCardRef) return;
    registerCardRef(String(rental.id), element);
  };

  return (
    <div
      ref={handleCardRef}
      className={`bg-gray-800 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
        isHighlighted
          ? "border-blue-500 shadow-lg ring-2 ring-blue-900/50"
          : "border-gray-700 hover:border-gray-600"
      } ${isTemporaryBooking ? "ring-1 ring-orange-600/30" : ""}`}
    >
      <div className="p-3 sm:p-4">
        {isTemporaryBooking && (
          <div className="mb-2 px-2 py-1.5 bg-orange-900/20 border border-orange-700 rounded-md">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
              <span className="text-orange-200 text-xs font-medium">
                Admin Managed (Instagram)
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 truncate">
              {rental.cameras?.name || "Camera Equipment"}
              {rental.cameras?.serial_number && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  #{rental.cameras.serial_number}
                </span>
              )}
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-300">
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                <span className="truncate">{customerName}</span>
              </div>
              <span className="hidden sm:inline text-gray-500">•</span>
              <span className="truncate">{customerEmail}</span>
              {rental.customer_contact && (
                <>
                  <span className="hidden sm:inline text-gray-500">•</span>
                  <span className="truncate">{rental.customer_contact}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-start sm:items-end gap-1.5 flex-shrink-0">
            <span
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium border ${getStatusColor(
                rental.rental_status
              )}`}
            >
              {getStatusText(rental.rental_status)}
            </span>
            {rental.rental_status === "confirmed" && initialPayment && (
              <PaymentStatusBadge
                rental={{
                  ...rental,
                  payment_status: initialPayment.payment_status,
                  selectedPayment: initialPayment,
                }}
                onOpenVerification={() => onOpenPaymentVerification(rental)}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-md">
            <DollarSign className="h-4 w-4 text-green-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                ₱{rental.total_price?.toFixed(2) || "0.00"}
              </p>
              <p className="text-[10px] text-gray-400">Total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-md">
            <Clock className="h-4 w-4 text-orange-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {inclusiveDays(rental.start_date, rental.end_date)} days
              </p>
              <p className="text-[10px] text-gray-400">Duration</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-md">
            <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">
                {formatDate(rental.start_date)}
              </p>
              <p className="text-[10px] text-gray-400">Start</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-md">
            <Calendar className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">
                {formatDate(rental.end_date)}
              </p>
              <p className="text-[10px] text-gray-400">End</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {rental.rental_status === "pending" && (
            <>
              <button
                onClick={() => onApprove(rental.id)}
                disabled={loadingKey === "approve"}
                className="inline-flex items-center gap-1 sm:gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              >
                {loadingKey === "approve" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                <span>Approve</span>
              </button>
              <button
                onClick={() => onReject(rental.id)}
                disabled={loadingKey === "reject"}
                className="inline-flex items-center gap-1 sm:gap-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              >
                {loadingKey === "reject" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                <span>Reject</span>
              </button>
            </>
          )}

          {(rental.rental_status === "confirmed" ||
            rental.rental_status === "active") && (
            <button
              onClick={() => onManageLogistics(rental.id)}
              className="inline-flex items-center gap-1 sm:gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors"
            >
              <Truck className="h-3 w-3" />
              <span className="hidden xs:inline">Manage </span>
              <span>Logistics</span>
            </button>
          )}

          {rental.rental_status !== "active" &&
            rental.rental_status === "confirmed" &&
            rental.shipping_status === "delivered" && (
              <button
                onClick={() => onStart(rental.id)}
                disabled={loadingKey === "start"}
                className="inline-flex items-center gap-1 sm:gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              >
                {loadingKey === "start" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                <span>Activate</span>
              </button>
            )}

          {isTemporaryBooking && (
            <>
              {rental.rental_status === "confirmed" && (
                <button
                  onClick={() => onConfirmReceived(rental.id)}
                  disabled={loadingKey === "received"}
                  className="inline-flex items-center gap-1 sm:gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {loadingKey === "received" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  <span className="hidden xs:inline">Customer </span>
                  <span>Received</span>
                </button>
              )}
              {rental.rental_status === "active" && (
                <button
                  onClick={() => onConfirmReturned(rental.id)}
                  disabled={loadingKey === "returned"}
                  className="inline-flex items-center gap-1 sm:gap-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {loadingKey === "returned" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Truck className="h-3 w-3" />
                  )}
                  <span className="hidden xs:inline">Customer </span>
                  <span>Returned</span>
                </button>
              )}
              {(rental.rental_status === "confirmed" ||
                rental.rental_status === "active") && (
                <button
                  onClick={() => onMarkDelivered(rental.id)}
                  disabled={loadingKey === "delivered"}
                  className="inline-flex items-center gap-1 sm:gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {loadingKey === "delivered" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Truck className="h-3 w-3" />
                  )}
                  <span>Mark Delivered</span>
                </button>
              )}
            </>
          )}

          {rental.contract_pdf_url && (
            <button
              onClick={() => onViewContract(rental.id, rental.contract_pdf_url)}
              disabled={contractLoading}
              className="inline-flex items-center gap-1 sm:gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
            >
              {contractLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">View </span>
              <span>Contract</span>
            </button>
          )}

          {rental.rental_status === "confirmed" &&
            initialPayment?.payment_receipt_url && (
              <button
                onClick={() => onViewPaymentReceipt(initialPayment.id)}
                className="inline-flex items-center gap-1 sm:gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors"
              >
                <Receipt className="h-3 w-3" />
                <span className="hidden sm:inline">View </span>
                <span>Receipt</span>
              </button>
            )}

          {rental.rental_status === "cancelled" && (
            <button
              onClick={() => onRemoveCancelled(rental.id)}
              disabled={loadingKey === "remove"}
              className="inline-flex items-center gap-1 sm:gap-1.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loadingKey === "remove" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              <span className="hidden xs:inline">Remove & </span>
              <span>Free Dates</span>
            </button>
          )}

          <button
            onClick={() => onViewDetails(rental)}
            className="inline-flex items-center gap-1 sm:gap-1.5 text-gray-300 hover:text-white active:text-gray-100 text-xs font-medium transition-colors"
          >
            <Eye className="h-3 w-3" />
            <span className="hidden xs:inline">View </span>
            <span>Details</span>
          </button>

          <button
            onClick={() => onDelete(rental.id)}
            disabled={loadingKey === "delete"}
            className="inline-flex items-center gap-1 sm:gap-1.5 text-red-400 hover:text-red-300 active:text-red-200 text-xs font-medium ml-auto transition-colors"
          >
            {loadingKey === "delete" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            <span>Delete</span>
          </button>
        </div>

        {contractError && (
          <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-red-300 text-xs">{contractError}</p>
          </div>
        )}

        {rental.rental_status === "rejected" && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-700 rounded-md">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-red-200 text-xs font-medium mb-0.5">
                  Auto Removal Scheduled
                </p>
                {rejectionCountdownDays !== null ? (
                  <p className="text-red-300 text-xs leading-relaxed">
                    {rejectionCountdownDays > 0
                      ? `This request will be permanently deleted in ${rejectionCountdownDays} day${
                          rejectionCountdownDays === 1 ? "" : "s"
                        } (${formatDate(rental.rejection_expires_at)}).`
                      : `This request is queued for removal within 24 hours (${formatDate(
                          rental.rejection_expires_at
                        )}).`}
                  </p>
                ) : (
                  <p className="text-red-300 text-xs leading-relaxed">
                    Deletion is scheduled shortly.
                  </p>
                )}
                {rental.rejection_reason && (
                  <p className="text-red-400 text-[10px] mt-1">
                    Reason: {rental.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {rental.rental_status === "cancelled" && rental.cancellation_reason && (
          <div className="mt-2 p-2 bg-orange-900/20 border border-orange-700 rounded-md">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-orange-200 text-xs font-medium mb-0.5">
                  Cancellation Reason
                </p>
                <p className="text-orange-300 text-xs leading-relaxed">
                  {rental.cancellation_reason}
                </p>
                {rental.cancelled_by && (
                  <p className="text-orange-400 text-[10px] mt-1">
                    By: {rental.cancelled_by === "user" ? "Customer" : "Admin"}
                    {rental.cancelled_at && ` on ${formatDate(rental.cancelled_at)}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
