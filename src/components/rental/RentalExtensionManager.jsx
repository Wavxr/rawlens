import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  CreditCard, 
  XCircle,
  Loader2,
} from 'lucide-react';
import { userRequestRentalExtension, userGetExtensionHistory } from '../../services/extensionService';
import { uploadPaymentReceipt } from '../../services/paymentService';
import { toast } from 'react-toastify';

const RentalExtensionManager = ({ rental, userId, onRefresh }) => {
  const [extensionHistory, setExtensionHistory] = useState([]);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [uploadingPayment, setUploadingPayment] = useState({});
  const [showHistory, setShowHistory] = useState(false);

  const loadExtensionHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const result = await userGetExtensionHistory(userId);
      if (result.success) {
        const rentalExtensions = result.data.filter(ext => ext.rental_id === rental.id);
        setExtensionHistory(rentalExtensions);
      }
    } catch (error) {
      console.error('Error loading extension history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, rental.id]);

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
        if (onRefresh) onRefresh();
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
        if (onRefresh) onRefresh();
      } else {
        toast.error(result.error || 'Failed to upload receipt');
      }
    } catch {
      toast.error('Failed to upload payment receipt');
    } finally {
      setUploadingPayment(prev => ({ ...prev, [extensionPaymentId]: false }));
    }
  };

  const getExtensionStatusInfo = (extension) => {
    switch (extension.extension_status) {
      case 'pending':
        return {
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Clock,
          title: 'Under Admin Review',
          description: 'Your extension request is being reviewed by our admin team. We\'ll notify you once it\'s approved or if we need more information.'
        };
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle2,
          title: 'Extension Approved!',
          description: 'Great news! Your extension has been approved. Please make the payment to confirm the new dates.'
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          title: 'Extension Request Declined',
          description: extension.admin_notes || 'Your extension request couldn\'t be approved. Please contact us if you have questions.'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: AlertCircle,
          title: 'Extension Request',
          description: 'Status unknown'
        };
    }
  };

  const getPaymentStatusInfo = (payment) => {
    if (!payment) return null;
    
    switch (payment.payment_status) {
      case 'pending':
        return {
          color: 'bg-amber-100 text-amber-800',
          icon: CreditCard,
          title: 'Payment Required',
          description: 'Please upload your payment receipt to complete the extension.',
          canUpload: true
        };
      case 'submitted':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: Clock,
          title: 'Payment Under Review',
          description: 'Your payment receipt is being verified. This usually takes up to 24 hours.',
          canUpload: false
        };
      case 'verified':
        return {
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle2,
          title: 'Payment Verified',
          description: 'Your rental has been extended successfully.',
          canUpload: false
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800',
          icon: XCircle,
          title: 'Payment Receipt Rejected',
          description: 'Please upload a new, clear payment receipt.',
          canUpload: true
        };
      default:
        return null;
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
    const hasActivePendingRequest = extensionHistory.some(ext => 
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
      ) : extensionHistory.length > 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#052844]" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Extension History</h3>
              <span className="px-2 py-0.5 bg-[#052844] text-white text-xs rounded-md">
                {extensionHistory.length}
              </span>
            </div>
            <div className={`transform transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {showHistory && (
            <div className="mt-4 space-y-3">
          
          {extensionHistory.map((extension) => {
            const statusInfo = getExtensionStatusInfo(extension);
            const StatusIcon = statusInfo.icon;
            const extensionPayment = extension.payments?.[0]; // Extension payments are linked via extension_id
            const paymentInfo = getPaymentStatusInfo(extensionPayment);
            
            // Only hide extension status if it's approved AND payment is verified (extension completed)
            const hideExtensionStatus = extension.extension_status === 'approved' && extensionPayment?.payment_status === 'verified';
            
            return (
              <div key={extension.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3">
                {/* Extension Status - Show for pending, rejected, or approved with unverified payment */}
                {!hideExtensionStatus && (
                  <div className={`border rounded-lg p-3 ${statusInfo.color}`}>
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{statusInfo.title}</h4>
                        <p className="text-xs opacity-90 mt-0.5">{statusInfo.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extension Details - Compact */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-md p-2">
                    <div className="text-xs text-gray-500 font-medium mb-0.5">
                      Original
                    </div>
                    <div className="text-xs font-medium text-gray-900">
                      {formatDate(extension.original_end_date)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-md p-2">
                    <div className="text-xs text-gray-500 font-medium mb-0.5">
                      Requested
                    </div>
                    <div className="text-xs font-medium text-gray-900">
                      {formatDate(extension.requested_end_date)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-md p-2">
                    <div className="text-xs text-gray-500 font-medium mb-0.5">
                      Cost
                    </div>
                    <div className="text-xs font-medium text-gray-900 flex items-center gap-0.5">
                      ₱{Number(extension.additional_price).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Payment Section - Only show if extension is approved */}
                {extension.extension_status === 'approved' && paymentInfo && (
                  <div className={`border rounded-lg p-3 ${paymentInfo.color}`}>
                    <div className="flex items-start gap-2">
                      <paymentInfo.icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-0.5">{paymentInfo.title}</h4>
                        <p className="text-xs opacity-90 mb-2">{paymentInfo.description}</p>
                        
                        {paymentInfo.canUpload && (
                          <div className="space-y-2">
                            <div className="bg-white/50 rounded-md p-2">
                              <div className="text-xs text-gray-600 font-medium mb-1">
                                Amount: ₱{Number(extension.additional_price).toFixed(2)}
                              </div>
                            </div>
                            
                            <div>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file && extensionPayment?.id) {
                                    handleUploadPaymentReceipt(extensionPayment.id, file);
                                  }
                                }}
                                disabled={uploadingPayment[extensionPayment?.id]}
                                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#052844]/10 file:text-[#052844] hover:file:bg-[#052844]/20 disabled:opacity-50 file:transition-colors file:duration-150"
                              />
                              {uploadingPayment[extensionPayment?.id] && (
                                <div className="flex items-center gap-2 mt-1.5 text-xs text-[#052844]">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Uploading...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Request Date - Compact */}
                <div className="text-xs text-gray-500 flex items-center gap-1 pt-1 border-t border-gray-100">
                  <Clock className="w-3 h-3" />
                  {new Date(extension.requested_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            );
          })}
            </div>
          )}
        </div>
      ) : !canRequestExtension() && extensionHistory.length === 0 ? (
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