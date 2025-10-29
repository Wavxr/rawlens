import { useState } from 'react';
import { Calendar, Camera as CameraIcon, ArrowRight, Clock, CheckCircle2, XCircle } from 'lucide-react';

// Format date string to readable format
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// StatusPill Component - Visual status indicator
const StatusPill = ({ status }) => {
  const statusConfig = {
    pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: Clock,
    },
    confirmed: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: CheckCircle2,
    },
    rejected: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
      icon: XCircle,
    },
  };

  const config = statusConfig[status] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Clock,
  };

  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium border rounded-md ${config.bg} ${config.text} ${config.border} shadow-sm`}
    >
      <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      <span className="capitalize">{status}</span>
    </div>
  );
};

/**
 * RequestCard Component - Displays rental request in different layouts
 * @param {Object} props
 * @param {Object} props.rental - Rental object with camera, dates, status info
 * @param {boolean} props.isSelected - Whether this card is currently selected
 * @param {Function} props.onClick - Click handler
 * @param {string} props.variant - "sidebar" (desktop) or "mobile"
 */
const RequestCard = ({ rental, isSelected = false, onClick, variant = 'sidebar' }) => {
  const [imgBroken, setImgBroken] = useState(false);
  
  const camera = rental.cameras || {};
  const cameraName = camera.name || 'Camera';
  const cameraImage = camera.image_url || '';
  const dateRange = `${formatDate(rental.start_date)} — ${formatDate(rental.end_date)}`;
  const referenceId = rental.id.slice(0, 8);

  // Calculate days
  const days = (() => {
    if (!rental.start_date || !rental.end_date) return null;
    const start = new Date(rental.start_date);
    const end = new Date(rental.end_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  })();

  // Mobile variant - horizontal card
  if (variant === 'mobile') {
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
                  className="w-full h-full object-cover"
                  onError={() => setImgBroken(true)}
                />
              ) : (
                <CameraIcon className="w-6 h-6 text-neutral-400" />
              )}
            </div>
            {/* Status dot */}
            <div
              className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ${
                rental.rental_status === 'confirmed'
                  ? 'bg-emerald-400'
                  : rental.rental_status === 'pending'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-red-400'
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
              <StatusPill status={rental.rental_status} />
            </div>

            {typeof rental.total_price === 'number' && (
              <div className="text-sm font-semibold text-[#052844]">
                ₱{Number(rental.total_price).toLocaleString('en-PH', {
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
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-[#052844]/5 border-[#052844]/30 shadow-sm'
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Camera Image */}
        <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
          {!imgBroken && cameraImage ? (
            <img
              src={cameraImage}
              alt={cameraName}
              className="object-cover w-full h-full"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <CameraIcon className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 truncate text-sm">{cameraName}</h3>
            {isSelected && <ArrowRight className="h-4 w-4 text-[#052844] flex-shrink-0" />}
          </div>

          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-gray-500 font-mono">#{referenceId}</span>
            {days && <span className="text-xs text-gray-600">{days} days</span>}
          </div>

          <span
            className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium mt-2 ${
              rental.rental_status === 'pending'
                ? 'bg-amber-100 text-amber-800'
                : rental.rental_status === 'confirmed'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {rental.rental_status.charAt(0).toUpperCase() + rental.rental_status.slice(1)}
          </span>

          <div className="text-xs text-gray-500 mt-1">{dateRange}</div>

          {typeof rental.total_price === 'number' && (
            <div className="text-sm font-semibold text-gray-900 mt-1">
              ₱{Number(rental.total_price).toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
