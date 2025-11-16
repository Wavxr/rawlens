import { useEffect, useState } from 'react';
import { 
  Camera as CameraIcon, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Loader2,
  AlertCircle 
} from 'lucide-react';
import PaymentDetails from '../../payment/PaymentDetails';
import PaymentUploadSection from '../../payment/PaymentUploadSection';
import CancellationModal from '../../modals/CancellationModal';
import { userCancelRentalRequest, userCancelConfirmedRental } from '../../../services/rentalService';
import { toast } from 'react-toastify';
import useBackHandler from '../../../hooks/useBackHandler';

/**
 * Format date string to readable format
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * StatusBadge Component
 */
const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: Clock,
      label: 'Pending Review'
    },
    confirmed: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: CheckCircle2,
      label: 'Confirmed'
    },
    rejected: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
      icon: XCircle,
      label: 'Declined'
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${config.bg} ${config.text} ${config.border} shadow-sm`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-semibold">{config.label}</span>
    </div>
  );
};

/**
 * RequestDetailView Component - Displays full rental request details
 * @param {Object} props
 * @param {Object} props.rental - Rental object
 * @param {Function} props.onRefresh - Callback to refresh data
 * @param {Function} props.onBack - Mobile back handler
 * @param {boolean} props.isMobile - Mobile layout flag
 */
const RequestDetailView = ({ rental, onRefresh, onBack, isMobile = false }) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setNow(Date.now());
  }, [rental?.id]);

  useEffect(() => {
    if (!rental?.rejection_expires_at) return undefined;

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [rental?.rejection_expires_at]);

  // Handle mobile back button - navigate back when back is pressed
  useBackHandler(!!rental, onBack, 100);

  if (!rental) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <CameraIcon className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Request Selected</h3>
          <p className="text-sm text-neutral-600">Select a request to view details</p>
        </div>
      </div>
    );
  }

  const camera = rental.cameras || {};
  const cameraName = camera.name || 'Camera';
  const cameraImage = camera.image_url || '';
  const dateRange = `${formatDate(rental.start_date)} — ${formatDate(rental.end_date)}`;
  const rejectionExpiryDate = rental.rejection_expires_at ? new Date(rental.rejection_expires_at) : null;
  const rejectionCountdownMs = rejectionExpiryDate ? rejectionExpiryDate.getTime() - now : null;

  const rejectionCountdownLabel = (() => {
    if (rejectionCountdownMs === null) return null;
    if (rejectionCountdownMs <= 0) {
      return 'within 24 hours';
    }

    const hours = Math.ceil(rejectionCountdownMs / (1000 * 60 * 60));
    if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    }

    const days = Math.ceil(rejectionCountdownMs / (1000 * 60 * 60 * 24));
    return `${days} day${days === 1 ? '' : 's'}`;
  })();

  // Payment status logic
  const initialPayment = rental.payments?.find(
    p => p.payment_type === 'rental' && !p.extension_id
  );
  const paymentStatus = initialPayment?.payment_status;

  const needsPaymentAction = rental.rental_status === 'confirmed' &&
    (!initialPayment || ['pending', 'rejected'].includes(paymentStatus));
  const isAwaitingVerification = rental.rental_status === 'confirmed' && paymentStatus === 'submitted';

  // Cancel handlers
  const handleCancelRequest = async () => {
    if (!confirm('Are you sure you want to cancel this rental request? This action cannot be undone.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const result = await userCancelRentalRequest(rental.id);
      if (result.success) {
        toast.success('Rental request cancelled successfully');
        if (onRefresh) onRefresh();
        if (isMobile && onBack) onBack();
      } else {
        toast.error(result.error || 'Failed to cancel rental request');
      }
    } catch {
      toast.error('Failed to cancel rental request');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelConfirmedRental = async (rentalId, reason) => {
    try {
      const result = await userCancelConfirmedRental(rentalId, reason);
      if (result.success) {
        toast.success('Rental cancelled successfully');
        setShowCancellationModal(false);
        if (onRefresh) onRefresh();
        if (isMobile && onBack) onBack();
      } else {
        toast.error(result.error || 'Failed to cancel rental');
      }
    } catch {
      toast.error('Failed to cancel rental');
    }
  };

  const canCancelConfirmed = () => {
    if (rental.rental_status !== 'confirmed') return false;
    
    const prohibitedShippingStatuses = [
      'in_transit_to_user',
      'delivered', 
      'active',
      'return_scheduled',
      'in_transit_to_owner'
    ];
    
    return !rental.shipping_status || 
           rental.shipping_status === 'ready_to_ship' || 
           !prohibitedShippingStatuses.includes(rental.shipping_status);
  };

  const handleUploadComplete = () => {
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Camera Image & Info */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {/* Camera Image */}
        <div className="aspect-video sm:aspect-[21/9] bg-neutral-100 flex items-center justify-center">
          {!imgBroken && cameraImage ? (
            <img
              src={cameraImage}
              alt={cameraName}
              className="w-full h-full object-contain p-3 sm:p-8"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <CameraIcon className="w-16 h-16 sm:w-24 sm:h-24 text-neutral-300" />
          )}
        </div>

        {/* Info Section */}
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-neutral-900 mb-2 truncate">
                {cameraName}
              </h2>
              <StatusBadge status={rental.rental_status} />
            </div>
            
            {/* Cancel Button */}
            {rental.rental_status === 'pending' && (
              <button
                onClick={handleCancelRequest}
                disabled={isCancelling}
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-red-600 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 hover:border-red-300 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                title="Cancel rental request"
              >
                {isCancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Cancel</span>
              </button>
            )}
            
            {canCancelConfirmed() && (
              <button
                onClick={() => setShowCancellationModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-amber-600 bg-amber-50 border-2 border-amber-200 rounded-xl hover:bg-amber-100 hover:border-amber-300 active:scale-95 transition-all duration-150 flex-shrink-0"
                title="Cancel confirmed rental"
              >
                <XCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Cancel</span>
              </button>
            )}
          </div>

          {/* Rental Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-3 sm:pt-4 border-t border-neutral-200">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-600" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wide mb-0.5 sm:mb-1">
                  Rental Period
                </div>
                <div className="text-xs sm:text-sm font-bold text-neutral-900 break-words">{dateRange}</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-600" />
              </div>
              <div>
                <div className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wide mb-0.5 sm:mb-1">
                  Submitted
                </div>
                <div className="text-xs sm:text-sm font-bold text-neutral-900">
                  {formatDate(rental.created_at)}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div>
                  <div className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wide mb-0.5 sm:mb-1">
                    Reference ID
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-black text-neutral-900">
                    #{rental.id.slice(0, 8)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wide mb-0.5 sm:mb-1">
                    Total Amount
                  </div>
                  <div className="text-base sm:text-xl font-black text-[#052844]">
                    ₱{Number(rental.total_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Details */}
      {rental.rental_status === 'rejected' && (
        <div className="bg-white border border-red-200 rounded-lg p-3 sm:p-5 shadow-sm">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <div className="text-sm font-semibold text-red-900 mb-1">Request Declined</div>
                <p className="text-sm text-red-700 leading-relaxed">
                  {rejectionCountdownLabel
                    ? `This request will be automatically removed ${rejectionCountdownLabel} (${formatDate(rental.rejection_expires_at)}).`
                    : 'This request is queued for automatic cleanup shortly.'}
                </p>
              </div>
              {rental.rejection_reason && (
                <div className="text-sm text-red-700 leading-relaxed border-t border-red-100 pt-2">
                  <span className="font-medium text-red-900">Reason:&nbsp;</span>
                  {rental.rejection_reason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Section - Only for confirmed rentals */}
      {rental.rental_status === 'confirmed' && (
        <div className="space-y-4">
          {/* Payment verified */}
          {paymentStatus === 'verified' && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-3 text-green-700">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Payment Verified ✓</div>
                  <div className="text-xs text-green-600 mt-1">
                    Your payment has been verified. Your rental will be prepared for delivery.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment required actions */}
          {needsPaymentAction && (
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-amber-900">Payment Required</div>
                    <div className="text-xs text-amber-700 mt-1">
                      Complete payment to confirm your rental booking
                    </div>
                  </div>
                </div>
                <PaymentDetails rental={rental} />
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                <PaymentUploadSection rental={rental} onUploadComplete={handleUploadComplete} />
              </div>
            </>
          )}

          {/* Awaiting verification - show details and status without duplicate warning */}
          {isAwaitingVerification && (
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                <PaymentDetails rental={rental} />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                <PaymentUploadSection rental={rental} onUploadComplete={handleUploadComplete} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        onConfirm={handleCancelConfirmedRental}
        rental={rental}
      />
    </div>
  );
};

export default RequestDetailView;