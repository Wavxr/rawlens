import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera as CameraIcon, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertCircle,
  FileText,
  PhilippinePeso,
  Timer,
  Package,
  Truck,
  CreditCard,
  ExternalLink,
  Upload
} from 'lucide-react';
import PaymentDetails from '../../payment/PaymentDetails';
import RentalExtensionManager from '../RentalExtensionManager';
import { AnimatePresence } from 'framer-motion';
import FeedbackForm from '../../forms/FeedbackForm';

/**
 * Format date string to readable format
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * BookingDetailView Component - Displays full booking/rental details
 * @param {Object} props
 * @param {Object} props.booking - Booking/rental object
 * @param {Function} props.onRefresh - Callback to refresh data
 * @param {Function} props.onBack - Mobile back handler
 * @param {boolean} props.isMobile - Mobile layout flag
 * @param {Object} props.actionLoading - Loading states for actions
 * @param {Object} props.contractViewLoading - Loading states for contract viewing
 * @param {Object} props.contractViewError - Error states for contract viewing
 * @param {Function} props.onConfirmDelivered - Confirm delivery handler
 * @param {Function} props.onConfirmSentBack - Confirm sent back handler
 * @param {Function} props.onViewContract - View contract handler
 * @param {Function} props.onCancelRental - Cancel rental handler
 * @param {boolean} props.canCancelRental - Whether rental can be cancelled
 * @param {Object} props.feedbackSubmitted - Feedback submission status by rental ID
 * @param {Function} props.onFeedbackSubmit - Feedback submit handler
 * @param {Function} props.onShowFeedbackForm - Show feedback form handler
 * @param {boolean} props.showFeedbackForm - Whether feedback form is visible
 * @param {string} props.userId - Current user ID
 * @param {Function} props.useCountdown - Countdown hook function
 */
const BookingDetailView = ({ 
  booking, 
  onRefresh, 
  isMobile = false,
  actionLoading = {},
  contractViewLoading = {},
  contractViewError = {},
  onConfirmDelivered,
  onConfirmSentBack,
  onViewContract,
  onCancelRental,
  canCancelRental = false,
  feedbackSubmitted = {},
  onFeedbackSubmit,
  onShowFeedbackForm,
  showFeedbackForm = false,
  userId,
  useCountdown
}) => {
  const navigate = useNavigate();
  const [imgBroken, setImgBroken] = useState(false);

  const days = useMemo(() => {
    if (!booking) return null;
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    const diff = (end - start) / (1000 * 3600 * 24);
    return isNaN(diff) ? null : Math.floor(diff);
  }, [booking]);

  // Calculate countdowns at the top level to satisfy React hooks rules
  let countdownToEndResult = null;
  let countdownToStartResult = null;
  
  if (useCountdown) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    countdownToEndResult = useCountdown(booking ? booking.end_date : new Date(), {
      dir: 'down',
      startDate: booking ? booking.start_date : new Date(),
      endDate: booking ? booking.end_date : new Date(),
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    countdownToStartResult = useCountdown(booking ? booking.start_date : new Date(), { dir: 'down' });
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <CameraIcon className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Booking Selected</h3>
          <p className="text-sm text-neutral-600">Select a booking to view details</p>
        </div>
      </div>
    );
  }

  const cameraName = booking?.cameras?.name || 'Camera';
  const cameraImage = booking?.cameras?.image_url || '';
  const cameraDesc = booking?.cameras?.description || '';
  const inclusions = booking?.cameras?.camera_inclusions || [];

  // Always use the initial payment record for payment status
  const initialPayment = booking.payments?.find(payment => payment.payment_type === 'rental' && !payment.extension_id);
  const paymentStatus = initialPayment?.payment_status;
  const isPaymentPending = booking.rental_status === 'confirmed' && (
    paymentStatus === 'pending' || paymentStatus === 'submitted' || paymentStatus === 'rejected' || !paymentStatus
  );

  // Determine if we should show countdowns
  const showCountdownToEnd = booking.rental_status === 'active' &&
    (booking.shipping_status === 'delivered' ||
      booking.shipping_status === 'return_scheduled' ||
      !booking.shipping_status);
  
  const showCountdownToStart = booking.rental_status === 'confirmed' && new Date(booking.start_date) > new Date();

  const countdownToEnd = showCountdownToEnd ? countdownToEndResult : null;
  const countdownToStart = showCountdownToStart ? countdownToStartResult : null;

  // Check if countdown is approaching end/start
  const daysUntil = (dateIso) => {
    if (!dateIso) return Number.POSITIVE_INFINITY;
    const start = new Date();
    const end = new Date(dateIso);
    const ms = end.getTime() - start.getTime();
    return Math.ceil(ms / (24 * 3600 * 1000));
  };

  const soonEnd = showCountdownToEnd && daysUntil(booking.end_date) <= 3;
  const soonStart = showCountdownToStart && daysUntil(booking.start_date) <= 2;

  // Delivery progress steps
  const shippingSteps = [
    { key: 'ready_to_ship', label: 'Packed', shortLabel: 'Packed', icon: Package },
    { key: 'in_transit_to_user', label: 'On the way', shortLabel: 'Transit', icon: Truck },
    { key: 'delivered', label: 'Delivered', shortLabel: 'Delivered', icon: CheckCircle2 },
    { key: 'return_scheduled', label: 'Return scheduled', shortLabel: 'Return', icon: Clock },
    { key: 'in_transit_to_owner', label: 'Returning', shortLabel: 'Returning', icon: Truck },
    { key: 'returned', label: 'Returned', shortLabel: 'Returned', icon: CheckCircle2 },
  ];

  const computeCurrentStep = (rental) => {
    if (!rental?.shipping_status) {
      if (rental.rental_status === 'confirmed') return 0;
      if (rental.rental_status === 'active') return 2;
      return 0;
    }
    const idx = shippingSteps.findIndex((s) => s.key === rental.shipping_status);
    return idx >= 0 ? idx : 0;
  };

  const currentStep = computeCurrentStep(booking);

  // Action checks
  const canConfirmDelivered = booking.shipping_status === 'in_transit_to_user';
  const canConfirmSentBack = booking.shipping_status === 'return_scheduled';

  // Payment pending view - simplified UI with call to action
  if (isPaymentPending) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Dynamic Header based on payment status */}
        <div className={`px-4 sm:px-6 py-3 sm:py-4 text-white ${
          paymentStatus === 'submitted' 
            ? 'bg-gradient-to-r from-[#052844] to-[#063a5e]'
            : paymentStatus === 'rejected'
            ? 'bg-gradient-to-r from-gray-700 to-gray-800'
            : 'bg-gradient-to-r from-[#052844] to-[#063a5e]'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold flex items-center">
                {paymentStatus === 'submitted' ? (
                  <>
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Under Review
                  </>
                ) : paymentStatus === 'rejected' ? (
                  <>
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Payment Rejected
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Payment Required
                  </>
                )}
              </h1>
              <div className="flex items-center space-x-2 sm:space-x-3 mt-2">
                <span className="text-xs font-mono bg-white/20 px-2 py-1 rounded">
                  #{booking.id.slice(0, 8)}
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-white/20">
                  {cameraName}
                </span>
              </div>
            </div>
            <div className="text-right">
              {typeof booking.total_price === 'number' && (
                <div className="text-lg sm:text-2xl font-bold">₱{Number(booking.total_price).toFixed(2)}</div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Payment Status Message */}
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg ${
            paymentStatus === 'submitted'
              ? 'bg-gray-50 border-gray-300'
              : paymentStatus === 'rejected'
              ? 'bg-gray-50 border-gray-300'
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="flex items-start space-x-2 sm:space-x-3">
              <AlertCircle className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 ${
                paymentStatus === 'submitted'
                  ? 'text-[#052844]'
                  : paymentStatus === 'rejected'
                  ? 'text-gray-600'
                  : 'text-[#052844]'
              }`} />
              <div>
                {paymentStatus === 'submitted' ? (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Payment Under Review</h3>
                    <p className="text-gray-700 text-xs sm:text-sm mb-3">
                      Great! Your payment receipt has been uploaded and is currently being reviewed by our admin team. 
                      You'll be notified once verification is complete (usually within 24 hours).
                    </p>
                    <p className="text-gray-600 text-xs sm:text-sm font-medium">
                      No further action required at this time. Please wait for verification.
                    </p>
                  </>
                ) : paymentStatus === 'rejected' ? (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Payment Receipt Rejected</h3>
                    <p className="text-gray-700 text-xs sm:text-sm mb-3">
                      Your previous payment receipt was not accepted. This could be due to unclear image, 
                      incorrect amount, or other issues. Please upload a new, clear payment confirmation.
                    </p>
                    <p className="text-gray-600 text-xs sm:text-sm font-medium">
                      Please go to your cart to upload a new payment receipt.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Payment Required to Proceed</h3>
                    <p className="text-gray-700 text-xs sm:text-sm mb-3">
                      Your rental has been confirmed by the admin, but payment is required before we can start preparing your order for delivery.
                    </p>
                    <p className="text-gray-600 text-xs sm:text-sm font-medium">
                      Please use any of the payment methods below and upload your receipt.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment Details - Show only if payment pending or rejected */}
          {(paymentStatus === 'pending' || paymentStatus === 'rejected' || !paymentStatus) && (
            <div className="mb-4 sm:mb-6">
              <PaymentDetails rental={booking} />
            </div>
          )}

          {/* Rental Summary - Condensed */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-gray-600">{formatDate(booking.start_date)} — {formatDate(booking.end_date)}</span>
              </div>
              <div className="font-semibold text-gray-900">
                ₱{Number(booking.total_price).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/user/cart')}
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-[#052844] hover:bg-[#063a5e] text-white font-medium rounded-lg transition-colors duration-150 text-sm sm:text-base"
            >
              {paymentStatus === 'submitted' ? (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Go to Your Cart
                </>
              ) : paymentStatus === 'rejected' ? (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Go to Your Cart
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Go to Your Cart
                </>
              )}
              <ExternalLink className="w-3 h-3 ml-2" />
            </button>
          </div>
          
          {/* Cancel Button - if applicable */}
          {canCancelRental && onCancelRental && (
            <div className="mt-4">
              <button
                onClick={() => onCancelRental(booking)}
                className="w-full inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-150 text-sm sm:text-base"
              >
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Cancel Rental
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular detail view for paid rentals
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className="bg-[#052844] px-4 sm:px-6 py-3 sm:py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">{cameraName}</h1>
            <div className="flex items-center space-x-2 sm:space-x-3 mt-2">
              <span className="text-xs font-mono bg-white/20 px-2 py-1 rounded">
                #{booking.id.slice(0, 8)}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-white/20">
                {booking.rental_status.charAt(0).toUpperCase() + booking.rental_status.slice(1)}
              </span>
            </div>
          </div>
          <div className="text-right">
            {typeof booking.total_price === 'number' && (
              <div className="text-lg sm:text-2xl font-bold">₱{Number(booking.total_price).toFixed(2)}</div>
            )}
            {days && (
              <div className="text-xs sm:text-sm text-gray-300">
                ₱{Number(booking.price_per_day).toFixed(2)}/day • {days} days
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Equipment Section */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          <div className="flex-shrink-0">
            <div className="w-full lg:w-64 h-48 lg:h-56 bg-gray-100 rounded-lg overflow-hidden">
              {!imgBroken && cameraImage ? (
                <img
                  src={cameraImage}
                  alt={cameraName}
                  className="object-cover w-full h-full"
                  onError={() => setImgBroken(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <CameraIcon className="h-12 w-12 sm:h-16 sm:w-16" />
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Equipment Details</h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                {cameraDesc || 'No description available.'}
              </p>
            </div>

            {inclusions && inclusions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Package Includes</h4>
                <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 max-h-24 sm:max-h-32 overflow-y-auto">
                    {inclusions.map((inc, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs sm:text-sm">
                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-700">
                          {inc?.inclusion_items?.name || 'Item'}
                          {inc?.quantity > 1 && <span className="text-gray-500 ml-1">×{inc.quantity}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <h4 className="font-medium text-gray-900 text-sm sm:text-base">Rental Period</h4>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Start Date</span>
                <span className="font-medium text-gray-900">{formatDate(booking.start_date)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">End Date</span>
                <span className="font-medium text-gray-900">{formatDate(booking.end_date)}</span>
              </div>
              {days != null && (
                <div className="flex justify-between text-xs sm:text-sm pt-1 sm:pt-2 border-t border-blue-200">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-semibold text-blue-700">
                    {days} day{days === 1 ? '' : 's'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <PhilippinePeso className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <h4 className="font-medium text-gray-900 text-sm sm:text-base">Pricing Details</h4>
            </div>
            <div className="space-y-1 sm:space-y-2">
              {days && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Daily Rate</span>
                  <span className="font-medium text-gray-900">₱{Number(booking.price_per_day).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs sm:text-sm pt-1 sm:pt-2 border-t border-green-200">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-semibold text-green-700">₱{Number(booking.total_price).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ready Status - Delivered but not yet started */}
        {booking.rental_status === 'confirmed' && booking.shipping_status === 'delivered' && (
          <div className="rounded-lg p-3 sm:p-4 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 text-sm sm:text-base mb-1">
                  📦 Equipment Ready - Starts Soon!
                </h4>
                <p className="text-green-800 text-xs sm:text-sm mb-2">
                  Great news! Your equipment has been delivered and is ready to use. Your rental period will begin on {formatDate(booking.start_date)}.
                </p>
                {countdownToStartResult && (
                  <div className="bg-white/60 rounded-md px-3 py-2 inline-block">
                    <div className="flex items-center space-x-2">
                      <Timer className="h-4 w-4 text-green-700" />
                      <span className="text-sm font-semibold text-green-900">
                        Starts in: {countdownToStartResult.days}d {countdownToStartResult.hours}h {countdownToStartResult.minutes}m
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Countdown Section */}
        {(showCountdownToEnd || showCountdownToStart) && !(booking.rental_status === 'confirmed' && booking.shipping_status === 'delivered') && (
          <div
            className={`rounded-lg p-3 sm:p-4 ${
              soonEnd || soonStart
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <Timer className={`h-4 w-4 sm:h-5 sm:w-5 ${soonEnd || soonStart ? 'text-amber-600' : 'text-blue-600'}`} />
              <h4 className={`font-medium text-sm sm:text-base ${soonEnd || soonStart ? 'text-amber-900' : 'text-blue-900'}`}>
                {showCountdownToEnd ? 'Time Remaining' : 'Starts In'}
              </h4>
            </div>
            
            <div className={`text-lg sm:text-2xl font-bold mb-2 ${soonEnd || soonStart ? 'text-amber-900' : 'text-blue-900'}`}>
              {showCountdownToEnd && countdownToEnd && (
                <span>
                  {countdownToEnd.days}d {countdownToEnd.hours}h {countdownToEnd.minutes}m
                </span>
              )}
              {showCountdownToStart && countdownToStart && (
                <span>
                  {countdownToStart.days}d {countdownToStart.hours}h {countdownToStart.minutes}m
                </span>
              )}
            </div>
            
            {(soonEnd || soonStart) && (
              <p className={`text-xs ${soonEnd || soonStart ? 'text-amber-700' : 'text-blue-700'}`}>
                {showCountdownToEnd && countdownToEnd && countdownToEnd.ms <= 0
                  ? '⚠️ Rental period has ended. Please return the item soon.'
                  : `📅 Reminder: Please prepare for ${soonEnd ? 'return' : 'delivery'}.`}
              </p>
            )}
          </div>
        )}

        {/* Delivery Progress */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Delivery Progress</h4>
          <div className="bg-gray-50 rounded-lg p-2 sm:p-4">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              {shippingSteps.map((step, idx) => {
                const Icon = step.icon;
                const reached = idx <= currentStep;
                const isActive = idx === currentStep;
                const displayLabel = isMobile ? step.shortLabel : step.label;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1 min-w-0">
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center border-2 ${
                        reached
                          ? isActive
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-4 lg:w-4" />
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs lg:text-xs mt-1 sm:mt-1.5 lg:mt-2 text-center leading-tight max-w-full ${
                        reached ? 'text-gray-900 font-medium' : 'text-gray-500'
                      }`}
                      title={step.label}
                    >
                      {displayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {booking.shipping_status === 'returned' ? (
          <div className="p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 sm:space-x-3">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800 text-xs sm:text-sm">Return Confirmed</p>
              <p className="text-xs text-green-600">The item has been successfully returned and checked by the admin.</p>
            </div>
          </div>
        ) : booking.shipping_status === 'in_transit_to_owner' ? (
          <div className="p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-2 sm:space-x-3">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-800 text-xs sm:text-sm">Return Shipment Sent</p>
              <p className="text-xs text-blue-600">You have marked the item as shipped back. It's now in transit to the owner.</p>
            </div>
          </div>
        ) : booking.shipping_status === 'return_scheduled' && actionLoading[booking.id] === 'confirmSentBack' ? (
          <div className="p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-2 sm:space-x-3">
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 animate-spin" />
            <div>
              <p className="font-medium text-blue-800 text-xs sm:text-sm">Processing Return Shipment</p>
              <p className="text-xs text-blue-600">Please wait while we process your return...</p>
            </div>
          </div>
        ) : null}

        {/* Rental Extension Manager - Only show for confirmed and active rentals that have been delivered */}
        {['confirmed', 'active'].includes(booking.rental_status) && 
         booking.shipping_status === 'delivered' && (
          <RentalExtensionManager 
            rental={booking} 
            userId={userId} 
            onRefresh={onRefresh}
          />
        )}

        {/* Action Buttons - Sticky on mobile for thumb-friendly access */}
        <div className="flex flex-wrap gap-2 sm:gap-3 sticky bottom-0 sm:static bg-white sm:bg-transparent p-3 sm:p-0 -mx-4 sm:mx-0 -mb-4 sm:mb-0 border-t sm:border-0 border-gray-200 shadow-lg sm:shadow-none z-10">
          {booking.contract_pdf_url && onViewContract && (
            <button
              onClick={() => onViewContract(booking.id, booking.contract_pdf_url)}
              disabled={!!contractViewLoading[booking.id]}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-[#052844] text-white rounded-lg hover:bg-[#063a5e] disabled:opacity-50 text-xs sm:text-sm font-medium transition-colors duration-150"
            >
              {contractViewLoading[booking.id] ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span>View Contract</span>
            </button>
          )}
          {canConfirmDelivered && onConfirmDelivered && (
            <button
              onClick={() => onConfirmDelivered(booking.id)}
              disabled={actionLoading[booking.id] === 'confirmDelivered'}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm font-medium transition-colors duration-150"
            >
              {actionLoading[booking.id] === 'confirmDelivered' ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span>Confirm Received</span>
            </button>
          )}
          {canConfirmSentBack && onConfirmSentBack && (
            <button
              onClick={() => onConfirmSentBack(booking.id)}
              disabled={actionLoading[booking.id] === 'confirmSentBack'}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-xs sm:text-sm font-medium transition-colors duration-150"
            >
              {actionLoading[booking.id] === 'confirmSentBack' ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Confirm Shipped Back</span>
                </>
              )}
            </button>
          )}
          
          {/* Feedback Button */}
          {(booking.rental_status === 'completed' || booking.rental_status === 'active') && 
           !feedbackSubmitted[booking.id] && 
           onShowFeedbackForm && (
            <button
              onClick={() => onShowFeedbackForm(true)}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-[#052844] text-white rounded-lg hover:bg-[#063a5e] text-xs sm:text-sm font-medium transition-colors duration-150"
            >
              <span>Give Feedback</span>
            </button>
          )}

          {feedbackSubmitted[booking.id] && (
            <div className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-green-100 text-green-800 rounded-md text-xs sm:text-sm font-medium">
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Feedback Submitted</span>
            </div>
          )}
        </div>

        {/* Feedback Form Modal */}
        {showFeedbackForm && onFeedbackSubmit && userId && (
          <AnimatePresence>
            <div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
              onClick={() => onShowFeedbackForm(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <FeedbackForm
                  rentalId={booking.id}
                  userId={userId}
                  onSuccess={onFeedbackSubmit}
                  onSkip={() => onShowFeedbackForm(false)}
                />
              </div>
            </div>
          </AnimatePresence>
        )}

        {contractViewError[booking.id] && (
          <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs sm:text-sm text-red-600">{contractViewError[booking.id]}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetailView;
