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
    if (isOpen && rental?.payment_receipt_url) {
      const fetchReceiptUrl = async () => {
        const result = await getPaymentReceiptUrl(rental.id);
        if (result.success) {
          setReceiptUrl(result.url);
        }
      };
      fetchReceiptUrl();
    }
  }, [isOpen, rental?.id, rental?.payment_receipt_url]);

  const handleVerify = async () => {
    setIsProcessing(true);
    try {
      await onVerify(rental.id);
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
      await onReject(rental.id, rejectionReason);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Verification</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p><strong>Customer:</strong> {rental.users?.first_name} {rental.users?.last_name}</p>
              <p><strong>Camera:</strong> {rental.cameras?.name}</p>
              <p><strong>Total Amount:</strong> ₱{rental.total_price || 'TBD'}</p>
            </div>
            
            {receiptUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Receipt:
                </label>
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={receiptUrl} 
                    alt="Payment receipt" 
                    className="w-full max-h-96 object-contain"
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
            
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (if rejecting):
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the payment is being rejected..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleVerify}
              disabled={isProcessing}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Verify Payment
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Reject Payment
            </button>
          </div>
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
          text: 'Payment Verified',
          icon: Check,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'submitted':
        return {
          text: 'Payment Pending Review',
          icon: AlertTriangle,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'rejected':
        return {
          text: 'Payment Rejected',
          icon: X,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          text: 'Payment Required',
          icon: CreditCard,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const { text, icon: Icon, className } = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 text-xs border rounded-full flex items-center gap-1 ${className}`}>
        <Icon className="w-3 h-3" />
        {text}
      </span>
      {rental.payment_status === 'submitted' && (
        <button
          onClick={onOpenVerification}
          className="text-blue-600 hover:text-blue-800 text-xs underline"
        >
          Review
        </button>
      )}
    </div>
  );
};

export { PaymentVerificationModal, PaymentStatusBadge };
