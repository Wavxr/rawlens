import { Truck, User, X } from "lucide-react";
import RentalStepper from "../../rental/RentalStepper";
import {
  formatDate,
  getStatusText,
  inclusiveDays,
  prettyShippingStatus,
} from "../../../utils/rentalFormatting";

// Displays the detailed modal for a selected rental.
export function RentalDetailModal({ rental, customer, onClose, onManageLogistics }) {
  if (!rental) return null;

  const isTemporaryBooking = rental.booking_type === "temporary";
  const customerName =
    rental.customer_name ||
    (rental.users
      ? `${rental.users.first_name} ${rental.users.last_name}`.trim()
      : "") ||
    "Unknown Customer";
  const customerEmail = rental.customer_email || rental.users?.email || "No email";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Rental Details</h2>
              <p className="text-gray-300 mt-1">
                {rental.cameras?.name}
                {rental.cameras?.serial_number && (
                  <span className="ml-2 text-sm text-gray-400">
                    #{rental.cameras.serial_number}
                  </span>
                )}
              </p>
              {isTemporaryBooking && (
                <div className="mt-2 px-3 py-1 bg-orange-900/20 border border-orange-700 rounded-lg inline-block">
                  <span className="text-orange-200 text-sm font-medium">
                    Admin Managed (Instagram Customer)
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onManageLogistics(rental.id)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Truck className="mr-1.5 h-4 w-4" />
                Manage Logistics
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 transition-colors p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <RentalStepper rental={rental} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Customer Information</h3>
                <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-white">{customerName}</p>
                      <p className="text-sm text-gray-300">{customerEmail}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-600">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-white">
                        {rental.customer_contact || customer?.contact_number || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Address</p>
                      <p className="text-sm text-white">
                        {customer?.address ? (
                          <>
                            {customer.address}
                            {customer.city && `, ${customer.city}`}
                            {customer.state && `, ${customer.state}`}
                            {customer.postal_code && ` ${customer.postal_code}`}
                          </>
                        ) : (
                          "Not provided"
                        )}
                      </p>
                    </div>
                  </div>
                  {customer?.emergency_contact && (
                    <div className="pt-3 border-t border-gray-600">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        Emergency Contact
                      </p>
                      <div className="bg-gray-600 rounded p-3">
                        <p className="text-sm text-white font-medium">
                          {customer.emergency_contact.name}
                        </p>
                        <p className="text-sm text-gray-300">
                          {customer.emergency_contact.phone}
                        </p>
                        <p className="text-sm text-gray-300">
                          {customer.emergency_contact.relationship}
                        </p>
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
                      <span className="text-gray-300 text-sm">
                        Rental Status: {getStatusText(rental.rental_status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">
                        Shipping Status: {prettyShippingStatus(rental.shipping_status)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Equipment</p>
                        <p className="text-sm font-medium text-white">
                          {rental.cameras?.name || "Camera Equipment"}
                          {rental.cameras?.serial_number && (
                            <span className="ml-2 text-xs text-gray-400">
                              #{rental.cameras.serial_number}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total Price</p>
                        <p className="text-sm font-medium text-white">
                          ₱{rental.total_price?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Start Date</p>
                        <p className="text-sm font-medium text-white">
                          {formatDate(rental.start_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">End Date</p>
                        <p className="text-sm font-medium text-white">
                          {formatDate(rental.end_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Duration</p>
                        <p className="text-sm font-medium text-white">
                          {inclusiveDays(rental.start_date, rental.end_date)} days
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
    </div>
  );
}
