import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  CreditCard, 
  Upload, 
  XCircle,
  Loader2,
  PhilippinePeso
} from 'lucide-react';
import { userRequestRentalExtension, userGetExtensionHistory } from '../../services/extensionService';
import { uploadPaymentReceipt, getPaymentReceiptUrl } from '../../services/paymentService';
import { toast } from 'react-toastify';

const RentalExtensionManager = ({ rental, userId, onRefresh }) => {
  const [extensionHistory, setExtensionHistory] = useState([]);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [uploadingPayment, setUploadingPayment] = useState({});

  // Load extension history on component mount
  useEffect(() => {
    loadExtensionHistory();
  }, [rental.id]);

  const loadExtensionHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await userGetExtensionHistory(userId);
      if (result.success) {
        // Filter extensions for current rental
        const rentalExtensions = result.data.filter(ext => ext.rental_id === rental.id);
        setExtensionHistory(rentalExtensions);
      }
    } catch (error) {
      console.error('Error loading extension history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

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
    } catch (error) {
      toast.error('Failed to request extension');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadPaymentReceipt = async (extensionPaymentId, file) => {
    setUploadingPayment(prev => ({ ...prev, [extensionPaymentId]: true }));
    try {
      const result = await uploadPaymentReceipt(extensionPaymentId, rental.id, file);
      
      if (result.success) {
        toast.success('Payment receipt uploaded successfully! 💸');
        await loadExtensionHistory();
        if (onRefresh) onRefresh();
      } else {
        toast.error(result.error || 'Failed to upload receipt');
      }
    } catch (error) {
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
          title: 'Extension Approved! 🎉',
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
          title: 'Payment Verified ✅',
          description: 'Payment confirmed! Your rental has been extended successfully.',
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

  // Calculate minimum date (current end date + 1 day)
  const getMinExtensionDate = () => {
    const currentEnd = new Date(rental.end_date);
    currentEnd.setDate(currentEnd.getDate() + 1);
    return currentEnd.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Extension Request Form */}
      {canRequestExtension() && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Extend Your Rental</h3>
              <p className="text-sm text-gray-600">Need more time? We can help extend your rental period.</p>
            </div>
          </div>

          {!showExtensionForm ? (
            <button
              onClick={() => setShowExtensionForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">How Extension Works</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading extension history...</span>
          </div>
        </div>
      ) : extensionHistory.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Extension History</h3>
          
          {extensionHistory.map((extension) => {
            const statusInfo = getExtensionStatusInfo(extension);
            const StatusIcon = statusInfo.icon;
            const extensionPayment = extension.payments?.[0]; // Extension payments are linked via extension_id
            const paymentInfo = getPaymentStatusInfo(extensionPayment);
            
            return (
              <div key={extension.id} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                {/* Extension Status */}
                <div className={`border rounded-lg p-4 ${statusInfo.color}`}>
                  <div className="flex items-start gap-3">
                    <StatusIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{statusInfo.title}</h4>
                      <p className="text-sm opacity-90">{statusInfo.description}</p>
                    </div>
                  </div>
                </div>

                {/* Extension Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                      Original End Date
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(extension.original_end_date)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                      Requested End Date
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(extension.requested_end_date)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                      Additional Cost
                    </div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      <PhilippinePeso className="w-3 h-3" />
                      {Number(extension.additional_price).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Payment Section - Only show if extension is approved */}
                {extension.extension_status === 'approved' && paymentInfo && (
                  <div className={`border rounded-lg p-4 ${paymentInfo.color}`}>
                    <div className="flex items-start gap-3">
                      <paymentInfo.icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{paymentInfo.title}</h4>
                        <p className="text-sm opacity-90 mb-3">{paymentInfo.description}</p>
                        
                        {paymentInfo.canUpload && (
                          <div className="space-y-3">
                            <div className="bg-white/50 rounded-lg p-3">
                              <div className="text-xs text-gray-600 uppercase tracking-wide font-medium mb-2">
                                Payment Amount
                              </div>
                              <div className="text-lg font-bold text-gray-900">
                                ₱{Number(extension.additional_price).toFixed(2)}
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Payment Receipt
                              </label>
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
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                              />
                              {uploadingPayment[extensionPayment?.id] && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Uploading receipt...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Request Date */}
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Requested on {new Date(extension.requested_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : !canRequestExtension() && extensionHistory.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No Extensions Available</h3>
          <p className="text-sm text-gray-500">
            Extensions can be requested for confirmed or active rentals.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default RentalExtensionManager;