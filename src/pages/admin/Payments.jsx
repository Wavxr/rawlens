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
  const [receiptUrlCache, setReceiptUrlCache] = useState({});
  const [receiptLoading, setReceiptLoading] = useState(new Set());
  const channelRef = useRef(null);
  const { setPayments, getPaymentsByStatus } = usePaymentStore();

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
      } catch {
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
  }, [setPayments]); // Include setPayments in dependencies

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
    } catch {
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
      <div className="p-3 sm:p-4 bg-gray-900 min-h-screen">
        <h1 className="text-xl sm:text-2xl font-semibold text-white mb-4">Payment Applications</h1>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-gray-400">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header Section */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Payment Applications</h1>
              <p className="mt-1 text-sm text-gray-400">Review and verify customer payment submissions</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{submittedPayments.length}</p>
                <p className="text-xs text-gray-400">Pending Reviews</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {submittedPayments.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No pending payments</h3>
            <p className="text-gray-400 max-w-sm mx-auto">All payment applications have been reviewed. New submissions will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {submittedPayments.map((payment) => {
            const isExpanded = expandedPayments.has(payment.id);
            const canVerify = payment.payment_type === 'rental' 
              ? payment.rentals?.rental_status === 'confirmed'
              : payment.rental_extensions?.extension_status === 'approved';

            return (
              <div key={payment.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-all duration-200 hover:shadow-lg">
                {/* Payment Header */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">
                          {payment.users?.first_name} {payment.users?.last_name}
                        </h3>
                        <p className="text-xs text-gray-400">{payment.users?.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      payment.payment_type === 'rental' 
                        ? 'bg-blue-900/20 text-blue-300 border-blue-800' 
                        : 'bg-purple-900/20 text-purple-300 border-purple-800'
                    }`}>
                      {payment.payment_type}
                    </span>
                  </div>

                  {/* Amount & Camera */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">Amount</p>
                      <p className="text-lg font-bold text-white">₱{Number(payment.amount || 0).toLocaleString('en-PH')}</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">Camera</p>
                      <p className="text-sm font-medium text-white truncate">{payment.rentals?.cameras?.name || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        canVerify ? 'bg-green-400' : 'bg-yellow-400'
                      }`}></div>
                      <span className={`text-xs font-medium ${
                        canVerify ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {canVerify ? 'Ready to Verify' : 'Awaiting Approval'}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleExpanded(payment.id)}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div className="p-4 bg-gray-700/30">
                    {/* Rental/Extension Details */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {payment.payment_type === 'extension' ? 'Extension Details' : 'Rental Details'}
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Rental ID:</span>
                          <span className="text-white font-mono">{payment.rental_id}</span>
                        </div>
                        {payment.payment_type === 'extension' && payment.rental_extensions ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Status:</span>
                              <span className={`font-medium ${
                                payment.rental_extensions.extension_status === 'approved' 
                                  ? 'text-green-400' 
                                  : payment.rental_extensions.extension_status === 'pending'
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}>
                                {payment.rental_extensions.extension_status}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">New End Date:</span>
                              <span className="text-white">{payment.rental_extensions.requested_end_date}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Dates:</span>
                              <span className="text-white text-right">{payment.rentals?.start_date} to {payment.rentals?.end_date}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Status:</span>
                              <span className={`font-medium ${
                                payment.rentals?.rental_status === 'confirmed' 
                                  ? 'text-green-400' 
                                  : payment.rentals?.rental_status === 'pending'
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}>
                                {payment.rentals?.rental_status}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                        <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                        Payment Details
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Method:</span>
                          <span className="text-white">{payment.payment_method || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Reference:</span>
                          <span className="text-white font-mono">{payment.payment_reference || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Receipt:</span>
                          {payment.payment_receipt_url ? (
                            <button
                              type="button"
                              onClick={() => handleFetchReceiptUrl(payment)}
                              disabled={receiptLoading.has(payment.id)}
                              className="text-blue-400 hover:text-blue-300 text-xs font-medium inline-flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
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
                            <span className="text-gray-500 text-xs">No receipt</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-3 border-t border-gray-600">
                      {!canVerify && (
                        <p className="text-xs text-red-400 mb-3">
                          {payment.payment_type === 'rental' 
                            ? 'Rental must be approved first' 
                            : 'Extension must be approved first'}
                        </p>
                      )}
                      <button
                        onClick={() => handleVerifyPayment(payment.id, payment.payment_type, payment)}
                        disabled={verifyingPayments.has(payment.id) || !canVerify}
                        className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {verifyingPayments.has(payment.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verify Payment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      </div>

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
        theme="dark"
      />
    </div>
  );
};

export default Payments;