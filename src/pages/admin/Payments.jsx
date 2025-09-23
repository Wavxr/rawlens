import React, { useEffect, useRef, useState } from 'react';
import { 
  CreditCard, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  User,
  PhilippinePeso,
  Loader2,
  Search,
  ExternalLink,
  FileText,
  RefreshCw
} from 'lucide-react';
import { 
  adminGetSubmittedPayments, 
  adminVerifyRentalPayment, 
  adminVerifyExtensionPayment,
  getPaymentReceiptUrl
} from '../../services/paymentService';
import { subscribeToAllPayments, unsubscribeFromChannel } from '../../services/realtimeService';
import useAuthStore from '../../stores/useAuthStore';
import usePaymentStore from '../../stores/paymentStore';
import { toast } from 'react-toastify';

const Payments = () => {
  const user = useAuthStore(state => state.user);
  const { payments, loading, setPayments } = usePaymentStore();
  const [processingPayment, setProcessingPayment] = useState({});
  const [viewingReceipt, setViewingReceipt] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const paymentSubscriptionRef = useRef(null);

  useEffect(() => {
    console.log('Payments useEffect triggered, user role:', user?.role);
    
    const loadPayments = async () => {
      try {
        const result = await adminGetSubmittedPayments();
        if (result.success) {
          setPayments(result.data);
        }
      } catch (error) {
        console.error('Error loading payments:', error);
      }
    };
    
    if (user?.role === 'admin') {
      loadPayments();
    }

    if (user?.role === 'admin' && !paymentSubscriptionRef.current) {
      console.log('Setting up payment subscription for admin');
      paymentSubscriptionRef.current = subscribeToAllPayments(payload => {
        console.log('Payment update received in admin Payments:', payload);
      });
      console.log('Payment subscription ref set:', paymentSubscriptionRef.current);
    }

    return () => {
      console.log('Cleaning up payment subscription');
      if (paymentSubscriptionRef.current) {
        unsubscribeFromChannel(paymentSubscriptionRef.current);
      }
      paymentSubscriptionRef.current = null;
      console.log('Payment subscription cleanup complete');
    };
  }, [user?.role, setPayments]);

  const handleViewReceipt = async (paymentId) => {
    try {
      setViewingReceipt(prev => ({ ...prev, [paymentId]: true }));
      const result = await getPaymentReceiptUrl(paymentId);
      
      if (result.success) {
        setReceiptUrl(result.url);
        setSelectedPayment(payments.find(p => p.id === paymentId));
        setShowReceiptModal(true);
      } else {
        toast.error(result.error || 'Failed to load receipt');
      }
    } catch (error) {
      toast.error('Error viewing receipt');
    } finally {
      setViewingReceipt(prev => ({ ...prev, [paymentId]: false }));
    }
  };

  const handleVerifyPayment = async (payment) => {
    try {
      setProcessingPayment(prev => ({ ...prev, [payment.id]: 'verifying' }));
      
      let result;
      if (payment.payment_type === 'rental') {
        result = await adminVerifyRentalPayment(payment.id);
      } else if (payment.payment_type === 'extension') {
        result = await adminVerifyExtensionPayment(payment.id);
      }
      
      if (result.success) {
        toast.success('Payment verified successfully! 🎉');
        setShowReceiptModal(false);
      } else {
        toast.error(result.error || 'Failed to verify payment');
      }
    } catch (error) {
      toast.error('Error verifying payment');
    } finally {
      setProcessingPayment(prev => ({ ...prev, [payment.id]: false }));
    }
  };

  const handleRejectPayment = async (payment) => {
    try {
      setProcessingPayment(prev => ({ ...prev, [payment.id]: 'rejecting' }));
      toast.info('Payment rejection functionality needs to be implemented');
    } catch (error) {
      toast.error('Error rejecting payment');
    } finally {
      setProcessingPayment(prev => ({ ...prev, [payment.id]: false }));
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

  const formatDateTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getPaymentTypeInfo = (payment) => {
    if (payment.payment_type === 'rental') {
      return {
        label: 'Rental Payment',
        description: `Initial payment for rental #${payment.rentals?.id?.slice(0, 8)}`,
        color: 'from-blue-500 to-indigo-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800'
      };
    } else if (payment.payment_type === 'extension') {
      return {
        label: 'Extension Payment',
        description: `Extension payment for rental #${payment.rentals?.id?.slice(0, 8)}`,
        color: 'from-purple-500 to-indigo-500',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-800'
      };
    }
    return {
      label: 'Unknown Payment',
      description: 'Payment type not recognized',
      color: 'from-gray-500 to-gray-500',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-800'
    };
  };

  const filteredPayments = payments.filter(payment => {
    const lowerSearch = (searchTerm || '').toLowerCase();
    const fields = [
      payment?.rentals?.cameras?.name,
      payment?.users?.first_name,
      payment?.users?.last_name,
      payment?.users?.email,
      payment?.rentals?.id,
      payment?.id,
    ];
    const matchesSearch = fields
      .map(v => (v == null ? '' : String(v)).toLowerCase())
      .some(text => text.includes(lowerSearch));

    const matchesType = paymentTypeFilter === 'all' || payment.payment_type === paymentTypeFilter;
    const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 sm:gap-3">
              <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 animate-spin text-blue-500" />
              <span className="text-sm sm:text-base text-gray-300">Loading payment submissions...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                <CreditCard className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-white">Payment Verification</h1>
                <p className="text-xs sm:text-base text-gray-400">Review and verify submitted payment receipts</p>
              </div>
            </div>
            <button
              onClick={() => {
                const loadPayments = async () => {
                  try {
                    const result = await adminGetSubmittedPayments();
                    if (result.success) {
                      setPayments(result.data);
                    }
                  } catch (error) {
                    console.error('Error loading payments:', error);
                  }
                };
                loadPayments();
              }}
              disabled={loading}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-md sm:rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs sm:text-sm">Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            {[
              { 
                label: 'Pending Verification', 
                value: payments.filter(p => p.payment_status === 'submitted').length,
                color: 'from-amber-600 to-orange-600',
                icon: Clock
              },
              { 
                label: 'Verified Today', 
                value: payments.filter(p => 
                  p.payment_status === 'verified' && 
                  new Date(p.updated_at).toDateString() === new Date().toDateString()
                ).length,
                color: 'from-green-600 to-emerald-600',
                icon: CheckCircle2
              },
              { 
                label: 'Extension Payments', 
                value: payments.filter(p => p.payment_type === 'extension').length,
                color: 'from-purple-600 to-indigo-600',
                icon: Calendar
              },
              { 
                label: 'Total Payments', 
                value: payments.length,
                color: 'from-blue-600 to-indigo-600',
                icon: CreditCard
              }
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-gray-900 rounded-lg sm:rounded-xl border border-gray-800 p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                      <Icon className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-900 rounded-lg sm:rounded-xl border border-gray-800 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by camera, user name, email, or rental ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md sm:rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                  className="px-3 sm:px-4 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-md sm:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="rental">Rental Payments</option>
                  <option value="extension">Extension Payments</option>
                </select>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 sm:px-4 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-md sm:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="bg-gray-900 rounded-lg sm:rounded-xl border border-gray-800 p-6 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gray-800 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">No Payments Found</h3>
            <p className="text-sm text-gray-400">
              {searchTerm || paymentTypeFilter !== 'all' || statusFilter !== 'submitted'
                ? 'No payments match your current filters.' 
                : 'No payment submissions found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredPayments.map((payment) => {
              const isProcessing = processingPayment[payment.id];
              const isViewingReceipt = viewingReceipt[payment.id];
              const rental = payment.rentals;
              const camera = rental?.cameras;
              const payer = payment.users;
              const typeInfo = getPaymentTypeInfo(payment);

              return (
                <div key={payment.id} className="bg-gray-800 rounded-lg sm:rounded-xl border border-gray-700 overflow-hidden">
                  <div className={`px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-700 ${
                    payment.payment_type === 'extension' 
                      ? 'bg-purple-900/20' 
                      : 'bg-blue-900/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-gradient-to-r ${typeInfo.color} flex items-center justify-center`}>
                          {payment.payment_type === 'extension' ? (
                            <Calendar className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                          ) : (
                            <CreditCard className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <h3 className="text-sm sm:text-base font-semibold text-white">{typeInfo.label}</h3>
                            <span className="text-gray-500 hidden sm:block">•</span>
                            <span className="text-xs sm:text-sm font-medium text-gray-300">{camera?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mt-1">
                            <span>Payment #{payment.id.slice(0, 8)}</span>
                            <span className="hidden sm:block">•</span>
                            <span className="hidden sm:block">{payer?.first_name} {payer?.last_name}</span>
                            <span className="hidden sm:block">•</span>
                            <span className="hidden sm:block">Submitted {formatDateTime(payment.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2 sm:mr-4">
                          <div className="text-lg sm:text-2xl font-bold text-white flex items-center gap-1">
                            <PhilippinePeso className="w-3 h-3 sm:w-5 sm:h-5" />
                            {Number(payment.amount).toFixed(2)}
                          </div>
                        </div>

                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                          payment.payment_status === 'submitted'
                            ? 'bg-amber-900/30 text-amber-400'
                            : payment.payment_status === 'verified'
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {payment.payment_status.charAt(0).toUpperCase() + payment.payment_status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                      <div className="bg-gray-900/50 rounded-md sm:rounded-lg p-2 sm:p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1 sm:mb-2">
                          Rental Period
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-white">
                          {formatDate(rental?.start_date)} - {formatDate(rental?.end_date)}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded-md sm:rounded-lg p-2 sm:p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1 sm:mb-2">
                          Payment Type
                        </div>
                        <div className={`text-xs sm:text-sm font-medium ${
                          payment.payment_type === 'extension' ? 'text-purple-400' : 'text-blue-400'
                        }`}>
                          {typeInfo.label}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded-md sm:rounded-lg p-2 sm:p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1 sm:mb-2">
                          Payment Method
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-white">
                          {payment.payment_method || 'Not specified'}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded-md sm:rounded-lg p-2 sm:p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1 sm:mb-2">
                          Reference
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-white">
                          {payment.payment_reference || 'None provided'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-900/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                        <h4 className="text-sm sm:text-base font-medium text-blue-400">Payer Information</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <span className="text-blue-400 font-medium">Name:</span>
                          <span className="text-blue-300 ml-2">
                            {payer?.first_name} {payer?.last_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-400 font-medium">Email:</span>
                          <span className="text-blue-300 ml-2">{payer?.email}</span>
                        </div>
                        <div>
                          <span className="text-blue-400 font-medium">Contact:</span>
                          <span className="text-blue-300 ml-2">{payer?.contact_number}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={() => handleViewReceipt(payment.id)}
                        disabled={isViewingReceipt || !payment.payment_receipt_url}
                        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white font-medium text-sm sm:text-base rounded-md sm:rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isViewingReceipt ? (
                          <>
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                            <span className="text-xs sm:text-sm">Loading...</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs sm:text-sm">View Receipt</span>
                          </>
                        )}
                      </button>
                      
                      {payment.payment_status === 'submitted' && (
                        <>
                          <button
                            onClick={() => handleVerifyPayment(payment)}
                            disabled={isProcessing}
                            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm sm:text-base rounded-md sm:rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {isProcessing === 'verifying' ? (
                              <>
                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                <span className="text-xs sm:text-sm">Verifying...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm">Verify Payment</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleRejectPayment(payment)}
                            disabled={isProcessing}
                            className="flex items-center justify-center gap-2 px-6 py-3 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {isProcessing === 'rejecting' ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4" />
                                Reject Payment
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showReceiptModal && selectedPayment && receiptUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg sm:rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-700">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Payment Receipt</h3>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    {getPaymentTypeInfo(selectedPayment).label} • ₱{Number(selectedPayment.amount).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {selectedPayment.payment_status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleVerifyPayment(selectedPayment)}
                        disabled={processingPayment[selectedPayment.id]}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white font-medium text-sm rounded-md sm:rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {processingPayment[selectedPayment.id] === 'verifying' ? (
                          <>
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                            <span className="text-xs sm:text-sm">Verifying...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs sm:text-sm">Verify</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectPayment(selectedPayment)}
                        disabled={processingPayment[selectedPayment.id]}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-red-700 text-red-400 font-medium text-sm rounded-md sm:rounded-lg hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                      >
                        {processingPayment[selectedPayment.id] === 'rejecting' ? (
                          <>
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                            <span className="text-xs sm:text-sm">Rejecting...</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs sm:text-sm">Reject</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setShowReceiptModal(false);
                      setSelectedPayment(null);
                      setReceiptUrl('');
                    }}
                    className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-3 sm:p-6 overflow-auto">
                <div className="flex items-center justify-center bg-gray-800 rounded-lg min-h-[300px] sm:min-h-[400px]">
                  <img
                    src={receiptUrl}
                    alt="Payment Receipt"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden flex-col items-center gap-3 text-gray-500">
                    <FileText className="w-16 h-16" />
                    <p>Unable to display receipt image</p>
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in new tab
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;