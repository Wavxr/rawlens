import { useState, useMemo } from 'react';
import { Calendar, Camera as CameraIcon, ArrowRight, Clock, CheckCircle2, XCircle, CreditCard, Truck, Timer } from 'lucide-react';

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
 * StatusPill Component - Visual status indicator
 */
const StatusPill = ({ status, shippingStatus }) => {
  // Check for "Ready" state (delivered but not yet started)
  const isReady = status === 'confirmed' && shippingStatus === 'delivered';
  
  if (isReady) {
    return (
      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
        Ready - Starts Soon
      </span>
    );
  }

  const statusConfig = {
    confirmed: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200',
      icon: Clock,
      label: 'Confirmed',
    },
    active: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      icon: CheckCircle2,
      label: 'Active',
    },
    completed: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-200',
      icon: CheckCircle2,
      label: 'Completed',
    },
    cancelled: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200',
      icon: XCircle,
      label: 'Cancelled',
    },
  };

  const config = statusConfig[status] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Clock,
    label: status,
  };

  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium border rounded-md ${config.bg} ${config.text} ${config.border} shadow-sm`}
    >
      <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      <span className="capitalize">{config.label}</span>
    </div>
  );
};

/**
 * PaymentStatusPill Component - Payment status indicator
 */
const PaymentStatusPill = ({ paymentStatus }) => {
  if (paymentStatus === 'submitted') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
        Under Review
      </span>
    );
  }
  
  if (paymentStatus === 'rejected') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
        Receipt Rejected
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-[#052844] text-white">
      <CreditCard className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
      Payment Required
    </span>
  );
};

/**
 * BookingCard Component - Displays rental booking in different layouts
 * @param {Object} props
 * @param {Object} props.booking - Booking/rental object with camera, dates, status info
 * @param {boolean} props.isSelected - Whether this card is currently selected
 * @param {Function} props.onClick - Click handler
 * @param {string} props.variant - "sidebar" (desktop) or "mobile"
 * @param {Function} props.onCancel - Cancel button handler (optional)
 * @param {boolean} props.canCancel - Whether cancel button should be shown
 */
const BookingCard = ({ booking, isSelected = false, onClick, variant = 'sidebar', onCancel, canCancel = false }) => {
  const [imgBroken, setImgBroken] = useState(false);
  
  const camera = booking.cameras || {};
  const cameraName = camera.name || 'Camera';
  const cameraImage = camera.image_url || '';
  const dateRange = `${formatDate(booking.start_date)} — ${formatDate(booking.end_date)}`;
  const referenceId = booking.id.slice(0, 8);

  // Always use the initial payment record for payment status
  const initialPayment = booking.payments?.find(payment => payment.payment_type === 'rental' && !payment.extension_id);
  const paymentStatus = initialPayment?.payment_status;
  const isPaymentPending = booking.rental_status === 'confirmed' && (
    paymentStatus === 'pending' || paymentStatus === 'submitted' || paymentStatus === 'rejected' || !paymentStatus
  );

  // Calculate days
  const days = useMemo(() => {
    if (!booking.start_date || !booking.end_date) return null;
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    const diff = (end - start) / (1000 * 3600 * 24);
    return isNaN(diff) ? null : Math.floor(diff);
  }, [booking.start_date, booking.end_date]);

  // --- MOBILE VARIANT ---
  if (variant === 'mobile') {
    const isReady = booking.rental_status === 'confirmed' && booking.shipping_status === 'delivered';
    
    return (
      <div
        onClick={onClick}
        className="bg-white border border-neutral-200 rounded-lg p-3 shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-150 cursor-pointer"
      >
        <div className="flex items-start gap-2">
          {/* Camera Image */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-md overflow-hidden bg-neutral-100 flex items-center justify-center border border-neutral-200">
              {!imgBroken && cameraImage ? (
                <img
                  src={cameraImage}
                  alt={cameraName}
                  className="w-full h-full object-contain"
                  onError={() => setImgBroken(true)}
                />
              ) : (
                <CameraIcon className="w-6 h-6 text-neutral-400" />
              )}
            </div>
            <div
              className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ${
                isReady
                  ? 'bg-green-400'
                  : booking.rental_status === 'active'
                  ? 'bg-green-400'
                  : booking.rental_status === 'confirmed'
                  ? 'bg-blue-400'
                  : 'bg-gray-400'
              }`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-sm text-neutral-900 truncate">
                {cameraName}
              </h3>
              <ArrowRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            </div>

            <div className="flex items-center gap-1 text-[11px] text-neutral-600 mb-1">
              <Calendar className="w-3 h-3 text-neutral-400" />
              <span className="truncate">{dateRange}</span>
            </div>

            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-[2px] rounded-md">
                  #{referenceId}
                </span>
                {days && (
                  <span className="text-[11px] font-medium text-neutral-700">
                    {days} {days === 1 ? 'day' : 'days'}
                  </span>
                )}
              </div>
              <StatusPill
                status={booking.rental_status}
                shippingStatus={booking.shipping_status}
              />
            </div>

            {typeof booking.total_price === 'number' && (
              <div className="text-sm font-semibold text-[#052844]">
                ₱{Number(booking.total_price).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sidebar variant - vertical compact card for desktop
  // Payment pending card
  if (isPaymentPending) {
    return (
      <div
        className={`p-3 sm:p-4 rounded-lg border transition-all duration-150 ${
          isSelected
            ? 'bg-gray-100 border-gray-400 shadow-sm ring-2 ring-gray-300'
            : 'bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
        }`}
      >
        <div className="flex items-start space-x-2 sm:space-x-3">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 opacity-60 cursor-pointer"
            onClick={onClick}
          >
            {!imgBroken && cameraImage ? (
              <img
                src={cameraImage}
                alt={cameraName}
                className="w-full h-full object-contain"
                onError={() => setImgBroken(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <CameraIcon className="h-3 w-3 sm:h-5 sm:w-5" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-700 truncate text-sm">{cameraName}</h3>
              <div className="flex items-center gap-1">
                {canCancel && onCancel && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(booking);
                    }}
                    className="p-1 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                    title="Cancel rental"
                  >
                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-[#052844] flex-shrink-0" />
              </div>
            </div>
            
            <div className="flex items-center space-x-1.5 sm:space-x-2 mt-0.5 sm:mt-1">
              <span className="text-xs text-gray-500 font-mono">#{referenceId}</span>
            </div>
            
            <div className="mt-1 sm:mt-2">
              <PaymentStatusPill paymentStatus={paymentStatus} />
            </div>
            
            <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">
              {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
            </div>
            
            {typeof booking.total_price === 'number' && (
              <div className="text-sm font-semibold text-[#052844] mt-0.5 sm:mt-1">
                ₱{Number(booking.total_price).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div
      onClick={onClick}
      className={`p-2 sm:p-4 rounded-lg border cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-[#052844]/5 border-[#052844]/30 shadow-sm'
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
          {!imgBroken && cameraImage ? (
            <img
              src={cameraImage}
              alt={cameraName}
              className="w-full h-full object-contain"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <CameraIcon className="h-3 w-3 sm:h-5 sm:w-5" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 truncate text-sm">{cameraName}</h3>
            {isSelected && <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-[#052844] flex-shrink-0" />}
          </div>
          
          <div className="flex items-center space-x-1.5 sm:space-x-2 mt-0.5 sm:mt-1">
            <span className="text-xs text-gray-500 font-mono">#{referenceId}</span>
            {days && <span className="text-xs text-gray-600">{days} days</span>}
          </div>
          
          <div className="mt-1 sm:mt-2">
            <StatusPill status={booking.rental_status} shippingStatus={booking.shipping_status} />
          </div>
          
          <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">
            {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
          </div>
          
          {typeof booking.total_price === 'number' && (
            <div className="text-sm font-semibold text-gray-900 mt-0.5 sm:mt-1">
              ₱{Number(booking.total_price).toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCard;
