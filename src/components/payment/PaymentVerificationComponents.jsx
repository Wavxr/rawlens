import React, { useState, useEffect } from 'react';
import { Eye, Check, X, CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getPaymentReceiptUrl } from '../../services/paymentService';

const PaymentVerificationModal = ({ rental, isOpen, onClose, onVerify, onReject }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(null);

  // Get fresh signed URL for receipt
  useEffect(() => {
    if (isOpen && rental?.selectedPayment?.id) {
      const fetchReceiptUrl = async () => {
        const result = await getPaymentReceiptUrl(rental.selectedPayment.id);
        if (result.success) {
          setReceiptUrl(result.url);
        }
      };
      fetchReceiptUrl();
    }
  }, [isOpen, rental?.selectedPayment?.id]);

  const handleVerify = async () => {
    setIsProcessing(true);
    try {
      await onVerify(rental.selectedPayment.id);
      toast.success('Payment verified successfully!');
      onClose();
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    setIsProcessing(true);
    try {
      await onReject(rental.selectedPayment.id, rejectionReason);
      toast.success('Payment rejected successfully!');
      onClose();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 sm:p-4 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Payment Verification</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
            <p className="flex justify-between">
              <span className="text-gray-600">Customer:</span>
              <span className="font-medium text-gray-900">{rental.users?.first_name} {rental.users?.last_name}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-600">Camera:</span>
              <span className="font-medium text-gray-900">{rental.cameras?.name}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium text-gray-900">₱{rental.total_price || 'TBD'}</span>
            </p>
          </div>
          
          {receiptUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Receipt:
              </label>
              <div className="border rounded-lg overflow-hidden bg-gray-50">
                <img 
                  src={receiptUrl} 
                  alt="Payment receipt" 
                  className="w-full max-h-64 sm:max-h-80 object-contain"
                />
              </div>
              <a 
                href={receiptUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:underline text-sm"
              >
                <Eye className="w-3 h-3" />
                View full size
              </a>
            </div>
          )}
          
          <div className="border-t pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason (if rejecting):
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why the payment is being rejected..."
              className="w-full p-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2">
          <button
            onClick={handleVerify}
            disabled={isProcessing}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-2.5 px-4 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            Verify
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing || !rejectionReason.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-2.5 px-4 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

const PaymentStatusBadge = ({ rental, onOpenVerification }) => {
  const getStatusConfig = () => {
    switch (rental.payment_status) {
      case 'verified':
        return {
          text: 'Verified',
          icon: Check,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'submitted':
        return {
          text: 'Pending',
          icon: AlertTriangle,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'rejected':
        return {
          text: 'Rejected',
          icon: X,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          text: 'Required',
          icon: CreditCard,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const { text, icon: Icon, className } = getStatusConfig();

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`px-2 py-0.5 text-[10px] sm:text-xs border rounded-full flex items-center gap-1 ${className}`}>
        <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        <span className="hidden xs:inline">{text}</span>
      </span>
      {rental.payment_status === 'submitted' && (
        <button
          onClick={onOpenVerification}
          className="text-blue-600 hover:text-blue-800 text-[10px] sm:text-xs underline whitespace-nowrap"
        >
          Review
        </button>
      )}
    </div>
  );
};

export { PaymentVerificationModal, PaymentStatusBadge };
