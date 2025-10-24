import { useEffect, useState, useRef } from 'react';
import { Eye, Calendar, User, CreditCard, CheckCircle, ChevronDown, Loader2 } from 'lucide-react';
import { 
  adminGetSubmittedPayments, 
  adminVerifyRentalPayment, 
  adminVerifyExtensionPayment,
  getPaymentReceiptUrl
} from '../../services/paymentService';
import { subscribeToAllPayments, unsubscribeFromChannel } from '../../services/realtimeService';
import usePaymentStore from '../../stores/paymentStore';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Payments = () => {
  const [loading, setLoading] = useState(true);
  const [storeReady, setStoreReady] = useState(false);
  const [expandedPayments, setExpandedPayments] = useState(new Set());
  const [verifyingPayments, setVerifyingPayments] = useState(new Set());
  const [receiptUrlCache, setReceiptUrlCache] = useState({}); // paymentId -> signed URL
  const [receiptLoading, setReceiptLoading] = useState(new Set()); // paymentIds currently loading
  const channelRef = useRef(null);
  const { payments, setPayments, getPaymentsByStatus } = usePaymentStore();

  // Get only submitted payments from the store
  const submittedPayments = storeReady ? getPaymentsByStatus('submitted') : [];

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await adminGetSubmittedPayments();
        if (response.success) {
          setPayments(response.data);
          setStoreReady(true);
        } else {
          // Handle API error
        }
      } catch (error) {
        // Handle fetch error
      } finally {
        setLoading(false);
      }
    };    fetchPayments();

    // Subscribe to real-time updates - the store will be updated by the realtime service
    const channel = subscribeToAllPayments(() => {
      // The real-time service handles updating the store with hydrated data
      // We don't need to manually manage updates here
    });

    channelRef.current = channel;

    return () => {
      // Use the service function for cleanup
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
      }
    };
  }, []); // Empty dependency array

  const toggleExpanded = (paymentId) => {
    const newExpanded = new Set(expandedPayments);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
    }
    setExpandedPayments(newExpanded);
  };

  const handleVerifyPayment = async (paymentId, paymentType, payment) => {
    // Add to verifying set
    setVerifyingPayments(prev => new Set([...prev, paymentId]));
    
    let result;
    
    try {
      // Check if rental/extension is approved before allowing payment verification
      if (paymentType === 'rental') {
        const rentalStatus = payment.rentals?.rental_status;
        if (rentalStatus !== 'confirmed') {
          throw new Error(`Rental must be approved first (current status: ${rentalStatus})`);
        }
        result = await adminVerifyRentalPayment(paymentId);
      } else if (paymentType === 'extension') {
        // Find the extension associated with this payment
        const extensionId = payment.extension_id;
        if (!extensionId) {
          throw new Error('Extension payment must have an associated extension');
        }
        
        // Check extension status from the payment data
        // Note: We need to ensure the extension is approved
        result = await adminVerifyExtensionPayment(paymentId);
      }

      if (result.success) {
        toast.success(
          `${paymentType === 'rental' ? 'Rental' : 'Extension'} payment verified successfully!`, 
          {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
      } else {
        toast.error(
          `Failed to verify payment: ${result.error}`,
          {
            position: "bottom-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
      }
    } catch (error) {
      toast.error(
        'An unexpected error occurred while verifying the payment',
        {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
    } finally {
      // Remove from verifying set
      setVerifyingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(paymentId);
        return newSet;
      });
    }
  };

  const handleFetchReceiptUrl = async (payment) => {
    if (!payment?.payment_receipt_url) return; // no stored path
    const id = payment.id;
    // Use cached if available
    if (receiptUrlCache[id]) {
      window.open(receiptUrlCache[id], '_blank', 'noopener,noreferrer');
      return;
    }
    setReceiptLoading(prev => new Set([...prev, id]));
    try {
      const result = await getPaymentReceiptUrl(payment.id, { expiresIn: 3600 });
      if (result.success) {
        setReceiptUrlCache(prev => ({ ...prev, [id]: result.url }));
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error(result.error || 'Failed to generate receipt link');
      }
    } catch {
      toast.error('Failed to fetch receipt URL');
    } finally {
      setReceiptLoading(prev => { const copy = new Set(prev); copy.delete(id); return copy; });
    }
  };

  if (loading || !storeReady) {
    return (
      <div className="p-3 sm:p-4 bg-slate-50 min-h-screen">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-4">Payment Applications</h1>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-800 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-slate-500">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 bg-slate-50 min-h-screen">
      <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-4">Payment Applications</h1>

      {submittedPayments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-base font-medium text-slate-900 mb-1">No pending payments</h3>
          <p className="text-sm text-slate-500">There are no submitted payment applications to review.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {submittedPayments.map((payment) => {
            const isExpanded = expandedPayments.has(payment.id);
            return (
              <div key={payment.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                {/* Compact Header - Clickable */}
                <div 
                  className="bg-slate-800 text-white p-3 cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => toggleExpanded(payment.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {payment.users?.first_name} {payment.users?.last_name}
                        </p>
                        <p className="text-xs text-slate-300 truncate">
                          {payment.rentals?.cameras?.name || 'N/A'} • ₱{Number(payment.amount || 0).toLocaleString('en-PH')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        payment.payment_type === 'rental' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {payment.payment_type}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div className="border-t border-slate-200">
                    <div className="p-3">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Rental Details */}
                        <div className="space-y-2">
                          <h3 className="font-medium text-slate-900 text-sm flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
                            {payment.payment_type === 'extension' ? 'Extension Details' : 'Rental Details'}
                          </h3>
                          <div className="bg-slate-50 rounded-lg p-2.5 space-y-1.5">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-slate-500">Rental ID:</span>
                              <span className="text-xs text-slate-900 font-mono">{payment.rental_id}</span>
                            </div>
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-slate-500">Camera:</span>
                              <span className="text-xs text-slate-900 text-right">{payment.rentals?.cameras?.name || 'N/A'}</span>
                            </div>
                            {payment.payment_type === 'extension' && payment.rental_extensions ? (
                              <>
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-medium text-slate-500">Extension Status:</span>
                                  <span className={`text-xs font-semibold ${
                                    payment.rental_extensions.extension_status === 'approved' 
                                      ? 'text-green-700' 
                                      : payment.rental_extensions.extension_status === 'pending'
                                      ? 'text-amber-700'
                                      : 'text-red-700'
                                  }`}>
                                    {payment.rental_extensions.extension_status}
                                  </span>
                                </div>
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-medium text-slate-500">Original End:</span>
                                  <span className="text-xs text-slate-900 text-right">{payment.rental_extensions.original_end_date}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-medium text-slate-500">New End:</span>
                                  <span className="text-xs text-slate-900 text-right">{payment.rental_extensions.requested_end_date}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-medium text-slate-500">Dates:</span>
                                  <span className="text-xs text-slate-900 text-right">{payment.rentals?.start_date} to {payment.rentals?.end_date}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-medium text-slate-500">Total:</span>
                                  <span className="text-xs text-slate-900 font-semibold">₱{Number(payment.rentals?.total_price || 0).toLocaleString('en-PH')}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-medium text-slate-500">Rental Status:</span>
                                  <span className={`text-xs font-semibold ${
                                    payment.rentals?.rental_status === 'confirmed' 
                                      ? 'text-green-700' 
                                      : payment.rentals?.rental_status === 'pending'
                                      ? 'text-amber-700'
                                      : 'text-red-700'
                                  }`}>
                                    {payment.rentals?.rental_status}
                                  </span>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-slate-500">User Email:</span>
                              <span className="text-xs text-slate-900 text-right">{payment.users?.email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Details */}
                        <div className="space-y-2">
                          <h3 className="font-medium text-slate-900 text-sm flex items-center">
                            <CreditCard className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
                            Payment Details
                          </h3>
                          <div className="bg-slate-50 rounded-lg p-2.5 space-y-1.5">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-slate-500">Amount:</span>
                              <span className="text-xs text-slate-900 font-semibold">₱{Number(payment.amount || 0).toLocaleString('en-PH')}</span>
                            </div>
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-slate-500">Method:</span>
                              <span className="text-xs text-slate-900">{payment.payment_method || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-slate-500">Reference:</span>
                              <span className="text-xs text-slate-900 font-mono text-right">{payment.payment_reference || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-medium text-slate-500">Receipt:</span>
                              {payment.payment_receipt_url ? (
                                <button
                                  type="button"
                                  onClick={() => handleFetchReceiptUrl(payment)}
                                  disabled={receiptLoading.has(payment.id)}
                                  className="text-xs text-slate-600 hover:text-slate-800 font-medium inline-flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {receiptLoading.has(payment.id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-3 w-3 mr-1" /> View
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">No receipt</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer - Actions */}
                    <div className="bg-slate-50 px-3 py-2.5 border-t border-slate-200 flex justify-end">
                      {(() => {
                        // Check if rental/extension is approved
                        let canVerify = false;
                        let errorMessage = '';
                        
                        if (payment.payment_type === 'rental') {
                          canVerify = payment.rentals?.rental_status === 'confirmed';
                          if (!canVerify) {
                            errorMessage = 'Rental must be approved first';
                          }
                        } else if (payment.payment_type === 'extension') {
                          canVerify = payment.rental_extensions?.extension_status === 'approved';
                          if (!canVerify) {
                            errorMessage = 'Extension must be approved first';
                          }
                        }
                        
                        const isDisabled = verifyingPayments.has(payment.id) || !canVerify;
                        
                        return (
                          <div className="flex flex-col items-end gap-1">
                            {!canVerify && errorMessage && (
                              <span className="text-xs text-red-600 font-medium">
                                {errorMessage}
                              </span>
                            )}
                            <button
                              onClick={() => handleVerifyPayment(payment.id, payment.payment_type, payment)}
                              disabled={isDisabled}
                              className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                            >
                              {verifyingPayments.has(payment.id) ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                              )}
                              {verifyingPayments.has(payment.id) ? 'Verifying...' : 'Verify Payment'}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default Payments;