import { useEffect, useState, useRef } from 'react';
import { Eye, Calendar, User, CreditCard, CheckCircle, ChevronDown, Loader2 } from 'lucide-react';
import {
  adminGetSubmittedPayments,
  adminVerifyRentalPayment,
  adminVerifyExtensionPayment,
  adminReactivateRentalAfterExtensionPayment,
  getPaymentReceiptUrl,
} from '@services/paymentService';
import { subscribeToAllPayments, unsubscribeFromChannel } from '@services/realtimeService';
import usePaymentStore from '@stores/paymentStore';
import useBackHandler from '@hooks/useBackHandler';
import AdminInlineAlert from '@components/admin/layout/AdminInlineAlert';

const Payments = () => {
  const [loading, setLoading] = useState(true);
  const [storeReady, setStoreReady] = useState(false);
  const [expandedPayments, setExpandedPayments] = useState(new Set());
  const [verifyingPayments, setVerifyingPayments] = useState(new Set());
  const [receiptUrlCache, setReceiptUrlCache] = useState({});
  const [receiptLoading, setReceiptLoading] = useState(new Set());
  const [feedback, setFeedback] = useState(null);
  const channelRef = useRef(null);
  const { setPayments, getPaymentsByStatus } = usePaymentStore();

  const showFeedback = (type, message) => {
    if (!message) return;
    setFeedback({ type, message });
  };

  const dismissFeedback = () => setFeedback(null);

  const submittedPayments = storeReady ? getPaymentsByStatus('submitted') : [];

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await adminGetSubmittedPayments();
        if (response.success) {
          setPayments(response.data);
          setStoreReady(true);
        }
      } catch (error) {
        console.error('Failed to fetch submitted payments:', error);
      } finally {
        setLoading(false);
      }
    }; fetchPayments();

    const channel = subscribeToAllPayments(() => { });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
      }
    };
  }, [setPayments]);
  
  useBackHandler(expandedPayments.size > 0, () => {
    setExpandedPayments(new Set());
  }, 100);

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
    setVerifyingPayments(prev => new Set([...prev, paymentId]));
    try {
      let result;

      if (paymentType === 'rental') {
        const rentalStatus = payment.rentals?.rental_status;
        if (rentalStatus !== 'confirmed') {
          throw new Error(`Rental must be approved first (current status: ${rentalStatus || 'unknown'})`);
        }
        result = await adminVerifyRentalPayment(paymentId);
      } else if (paymentType === 'extension') {
        const extensionId = payment.extension_id;
        if (!extensionId) {
          throw new Error('Extension payment must have an associated extension.');
        }

        result = await adminVerifyExtensionPayment(paymentId);

        if (result.success) {
          const rentalId = payment.rental_id;
          const rentalStartDate = payment.rentals?.start_date ? new Date(payment.rentals.start_date) : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (rentalStartDate) {
            rentalStartDate.setHours(0, 0, 0, 0);
          }

          const hasStarted = !rentalStartDate || rentalStartDate <= today;
          const isAlreadyActive = payment.rentals?.rental_status === 'active';

          if (hasStarted || isAlreadyActive) {
            const reactivationResult = await adminReactivateRentalAfterExtensionPayment(rentalId);
            if (!reactivationResult.success) {
              showFeedback(
                'warning',
                'Extension payment verified, but the rental could not be reactivated automatically. Please review the rental status.'
              );
              return;
            }
          }
        }
      } else {
        throw new Error('Unsupported payment type.');
      }

      if (!result) {
        showFeedback('error', 'No response received while verifying the payment.');
        return;
      }

      if (result.success) {
        showFeedback(
          'success',
          `${paymentType === 'rental' ? 'Rental' : 'Extension'} payment verified successfully.`
        );
      } else {
        showFeedback(
          'error',
          result.error ? `Failed to verify payment: ${result.error}` : 'Failed to verify payment.'
        );
      }
    } catch (error) {
      showFeedback(
        'error',
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while verifying the payment.'
      );
    } finally {
      setVerifyingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(paymentId);
        return newSet;
      });
    }
  };

  const handleFetchReceiptUrl = async (payment) => {
    if (!payment?.payment_receipt_url) return;
    const id = payment.id;
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
        showFeedback('info', 'Opened the proof of payment in a new tab.');
      } else {
        showFeedback('error', result.error || 'Failed to generate receipt link.');
      }
    } catch (error) {
      showFeedback(
        'error',
        error instanceof Error ? error.message : 'Failed to fetch receipt URL.'
      );
    } finally {
      setReceiptLoading(prev => { const copy = new Set(prev); copy.delete(id); return copy; });
    }
  };

  if (loading || !storeReady) {
    return (
      <div className="p-6 flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto" />
          <p className="text-sm text-gray-400">Loading payment submissions...</p>
        </div>
      </div>
    );
  }

  const renderPaymentContent = () => {
    if (submittedPayments.length === 0) {
      return (
        <div className="text-center py-10 bg-gradient-to-br from-gray-900/70 to-gray-800/50 border border-gray-700/50 rounded-2xl">
          <CreditCard className="w-10 h-10 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No pending payments</h3>
          <p className="text-gray-400 max-w-sm mx-auto">
            All payment applications have been reviewed. New submissions will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {submittedPayments.map((payment) => {
          const isExpanded = expandedPayments.has(payment.id);
          const canVerify = payment.payment_type === 'rental'
            ? payment.rentals?.rental_status === 'confirmed'
            : payment.rental_extensions?.extension_status === 'approved';

          return (
            <div
              key={payment.id}
              className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/55 backdrop-blur-xl overflow-hidden transition-all duration-200 hover:border-blue-500/40"
            >
              <div className="p-4 border-b border-gray-800/70">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-900/70 border border-gray-700/60 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">
                        {payment.users?.first_name} {payment.users?.last_name}
                      </h3>
                      <p className="text-xs text-gray-400">{payment.users?.email}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      payment.payment_type === 'rental'
                        ? 'bg-blue-900/20 text-blue-300 border-blue-800'
                        : 'bg-purple-900/20 text-purple-300 border-purple-800'
                    }`}
                  >
                    {payment.payment_type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-900/60 border border-gray-800/70 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Amount</p>
                    <p className="text-lg font-bold text-white">₱{Number(payment.amount || 0).toLocaleString('en-PH')}</p>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-800/70 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Camera</p>
                    <p className="text-sm font-medium text-white truncate">{payment.rentals?.cameras?.name || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${canVerify ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <span className={`text-xs font-medium ${canVerify ? 'text-green-400' : 'text-yellow-400'}`}>
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

              {isExpanded ? (
                <div className="p-4 bg-gray-900/60 border-t border-gray-800/70">
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
                            <span
                              className={`font-medium ${
                                payment.rental_extensions.extension_status === 'approved'
                                  ? 'text-green-400'
                                  : payment.rental_extensions.extension_status === 'pending'
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}
                            >
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
                            <span
                              className={`font-medium ${
                                payment.rentals?.rental_status === 'confirmed'
                                  ? 'text-green-400'
                                  : payment.rentals?.rental_status === 'pending'
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {payment.rentals?.rental_status}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

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

                  <div className="pt-3 border-t border-gray-700/60">
                    {!canVerify ? (
                      <p className="text-xs text-red-400 mb-3">
                        {payment.payment_type === 'rental'
                          ? 'Rental must be approved first'
                          : 'Extension must be approved first'}
                      </p>
                    ) : null}
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
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold text-white">Payment Verification</h1>
            <p className="text-gray-400 text-sm md:text-base">Review and confirm rental and extension payments</p>
          </div>
        </div>

        {feedback ? (
          <AdminInlineAlert
            type={feedback.type}
            message={feedback.message}
            onDismiss={dismissFeedback}
          />
        ) : null}

        {renderPaymentContent()}
      </div>
    </div>
  );
};

export default Payments;