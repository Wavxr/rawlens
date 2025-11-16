import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { userRequestRentalExtension, userGetExtensionHistory } from '../../services/extensionService';
import { uploadPaymentReceipt } from '../../services/paymentService';
import useExtensionStore from '../../stores/extensionStore';
import { toast } from 'react-toastify';
import ExtensionHistoryCard from './extensions/ExtensionHistoryCard';

const RentalExtensionManager = ({ rental, userId }) => {
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [uploadingPayment, setUploadingPayment] = useState({});
  const [showHistory, setShowHistory] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = sessionStorage.getItem('rental-extension-history-open');
    return stored === null ? true : stored === 'true';
  });

  const extensions = useExtensionStore((state) => state.extensions);
  const setExtensions = useExtensionStore((state) => state.setExtensions);

  const rentalExtensions = useMemo(
    () => extensions.filter((extension) => extension.rental_id === rental.id),
    [extensions, rental.id]
  );

  const sortedExtensions = useMemo(() => {
    return [...rentalExtensions].sort((a, b) => {
      const aDate = new Date(a.requested_at).getTime();
      const bDate = new Date(b.requested_at).getTime();
      return bDate - aDate;
    });
  }, [rentalExtensions]);

  const latestExtensionSummary = useMemo(() => {
    if (!sortedExtensions.length) return null;

    const latest = sortedExtensions[0];
    const latestPayment = latest.payments?.[0] || null;

    if (latest.extension_status === 'pending') {
      return {
        icon: Clock,
        label: 'Extension under review',
        pillClass: 'bg-amber-100 text-amber-700 border border-amber-200',
      };
    }

    if (latest.extension_status === 'rejected') {
      return {
        icon: XCircle,
        label: 'Extension request declined',
        pillClass: 'bg-red-100 text-red-700 border border-red-200',
      };
    }

    if (latest.extension_status === 'approved') {
      if (!latestPayment) {
        return {
          icon: CheckCircle2,
          label: 'Extension approved',
          pillClass: 'bg-green-100 text-green-700 border border-green-200',
        };
      }

      switch (latestPayment.payment_status) {
        case 'pending':
          return {
            icon: AlertTriangle,
            label: 'Payment receipt required',
            pillClass: 'bg-blue-100 text-blue-700 border border-blue-200',
          };
        case 'submitted':
          return {
            icon: Clock,
            label: 'Receipt under review',
            pillClass: 'bg-blue-100 text-blue-700 border border-blue-200',
          };
        case 'verified':
          return {
            icon: CheckCircle2,
            label: 'Extension complete',
            pillClass: 'bg-green-100 text-green-700 border border-green-200',
          };
        case 'rejected':
          return {
            icon: XCircle,
            label: 'Upload a clearer receipt',
            pillClass: 'bg-red-100 text-red-700 border border-red-200',
          };
        default:
          return null;
      }
    }

    return null;
  }, [sortedExtensions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('rental-extension-history-open', String(showHistory));
  }, [showHistory]);

  const loadExtensionHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const result = await userGetExtensionHistory(userId);
      if (result.success) {
        setExtensions(result.data);
      }
    } catch (error) {
      console.error('Error loading extension history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, setExtensions]);

  useEffect(() => {
    loadExtensionHistory();
  }, [rental.id, loadExtensionHistory]);

  const handleRequestExtension = async (e) => {
    e.preventDefault();
    if (!newEndDate) {
      toast.error('Please select a new end date');
      return;
    }

    const currentEndDate = new Date(rental.end_date);
    const requestedEndDate = new Date(newEndDate);
    
    if (requestedEndDate <= currentEndDate) {
      toast.error('New end date must be after the current end date');
      return;
    }

    setIsLoading(true);
    try {
      const result = await userRequestRentalExtension(rental.id, userId, newEndDate);
      
      if (result.success) {
        toast.success('Extension request submitted successfully! 🎉');
        setShowExtensionForm(false);
        setNewEndDate('');
        await loadExtensionHistory();
      } else {
        toast.error(result.error || 'Failed to request extension');
      }
    } catch {
      toast.error('Failed to request extension');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadPaymentReceipt = async (extensionPaymentId, file) => {
    setUploadingPayment(prev => ({ ...prev, [extensionPaymentId]: true }));
    try {
      const result = await uploadPaymentReceipt({ 
        paymentId: extensionPaymentId, 
        rentalId: rental.id, 
        file, 
        scope: 'user', 
        extensionId: null 
      });
      
      if (result.success) {
        toast.success('Payment receipt uploaded successfully! 💸');
        await loadExtensionHistory();
      } else {
        toast.error(result.error || 'Failed to upload receipt');
      }
    } catch {
      toast.error('Failed to upload payment receipt');
    } finally {
      setUploadingPayment(prev => ({ ...prev, [extensionPaymentId]: false }));
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const canRequestExtension = () => {
    const hasActivePendingRequest = sortedExtensions.some(ext =>
      ext.extension_status === 'pending' || 
      (ext.extension_status === 'approved' && ext.payments?.[0]?.payment_status !== 'verified')
    );
    return !hasActivePendingRequest && ['confirmed', 'active'].includes(rental.rental_status);
  };

  const getMinExtensionDate = () => {
    const currentEnd = new Date(rental.end_date);
    currentEnd.setDate(currentEnd.getDate() + 1);
    return currentEnd.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Extension Request Form */}
      {canRequestExtension() && (
        <div className="bg-gradient-to-br from-[#052844]/5 to-[#052844]/10 border border-[#052844]/20 rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#052844] flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Extend Your Rental</h3>
              <p className="text-xs sm:text-sm text-gray-600">Need more time? We can help extend your rental period.</p>
            </div>
          </div>

          {!showExtensionForm ? (
            <button
              onClick={() => setShowExtensionForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#052844] text-white font-medium text-sm rounded-lg hover:bg-[#063a5e] transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              Request Extension
            </button>
          ) : (
            <form onSubmit={handleRequestExtension} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current End Date
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{formatDate(rental.end_date)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New End Date *
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    min={getMinExtensionDate()}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#052844] focus:border-[#052844] transition-all duration-150 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="bg-[#052844]/5 border border-[#052844]/20 rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#052844] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-[#052844] mb-1 text-sm sm:text-base">How Extension Works</h4>
                    <ul className="text-xs sm:text-sm text-gray-700 space-y-1">
                      <li>• Admin will review your request for camera availability</li>
                      <li>• Once approved, you'll need to pay for the additional days</li>
                      <li>• Your rental end date will be updated after payment verification</li>
                      <li>• Daily rate: ₱{rental.price_per_day}/day</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#052844] text-white font-medium text-sm rounded-lg hover:bg-[#063a5e] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Submit Request
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExtensionForm(false);
                    setNewEndDate('');
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Extension History */}
      {historyLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#052844]" />
            <span className="text-xs sm:text-sm text-gray-600">Loading extension history...</span>
          </div>
        </div>
      ) : sortedExtensions.length > 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#052844]" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Extension History</h3>
              <span className="px-2 py-0.5 bg-[#052844] text-white text-xs rounded-md">
                {sortedExtensions.length}
              </span>
              {latestExtensionSummary && (
                <span className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${latestExtensionSummary.pillClass}`}>
                  {(() => {
                    const SummaryIcon = latestExtensionSummary.icon;
                    return SummaryIcon ? <SummaryIcon className="h-3.5 w-3.5" /> : null;
                  })()}
                  {latestExtensionSummary.label}
                </span>
              )}
            </div>
            <div className={`transform transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {latestExtensionSummary && (
            <div className="mt-3 sm:hidden">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${latestExtensionSummary.pillClass}`}>
                {(() => {
                  const SummaryIcon = latestExtensionSummary.icon;
                  return SummaryIcon ? <SummaryIcon className="h-3.5 w-3.5" /> : null;
                })()}
                {latestExtensionSummary.label}
              </span>
            </div>
          )}
          
          {showHistory && (
            <div className="mt-4 space-y-3">
              {sortedExtensions.map((extension) => (
                <ExtensionHistoryCard
                  key={extension.id}
                  extension={extension}
                  onUploadReceipt={handleUploadPaymentReceipt}
                  uploadingPayment={uploadingPayment}
                />
              ))}
            </div>
          )}
        </div>
      ) : !canRequestExtension() && sortedExtensions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No Extensions Available</h3>
          <p className="text-xs sm:text-sm text-gray-500">
            Extensions can be requested for confirmed or active rentals.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default RentalExtensionManager;