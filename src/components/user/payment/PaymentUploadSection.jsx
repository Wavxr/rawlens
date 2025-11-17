import React, { useState, useEffect } from 'react';
import { Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
import { uploadPaymentReceipt, getPaymentReceiptUrl } from '@services/paymentService';
import { toast } from 'react-toastify';

const PaymentUploadSection = ({ rental, onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);

  // Get initial payment record for rental
  const initialPayment = rental.payments?.find(
    (p) => p.payment_type === 'rental' && p.extension_id == null
  );
  const paymentStatus = initialPayment?.payment_status;
  const paymentId = initialPayment?.id;

  // Fetch fresh signed URL for receipt if it exists
  useEffect(() => {
    if (paymentId && initialPayment?.receipt_url && (paymentStatus === 'submitted' || paymentStatus === 'rejected')) {
      const fetchReceiptUrl = async () => {
        const result = await getPaymentReceiptUrl(paymentId);
        if (result.success) {
          setReceiptUrl(result.url);
        }
      };
      fetchReceiptUrl();
    } else {
      setReceiptUrl(null);
    }
  }, [paymentId, initialPayment?.receipt_url, paymentStatus]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type and size
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    try {
      if (!paymentId) {
        toast.error("Payment record not found. Please refresh or contact support.");
        return;
      }

    const { success, error } = await uploadPaymentReceipt({ paymentId, rentalId: rental.id, file, scope: 'user' });

      if (success) {
        toast.success("Payment receipt uploaded successfully!");
        setFile(null);
        onUploadComplete();
      } else {
        toast.error("Failed to upload receipt: " + error);
      }
    } catch (err) {
      console.error("handleUpload error:", err);
      toast.error("Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  if (paymentStatus === 'verified') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          <span className="text-sm font-semibold">Payment Verified ✓</span>
        </div>
        <div className="text-sm text-green-600">
          Your payment has been successfully verified by our admin team. Your rental is now confirmed and will be prepared for delivery.
        </div>
      </div>
    );
  }

  if (paymentStatus === 'submitted') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-blue-700">
          <Check className="w-5 h-5" />
          <span className="text-sm font-semibold">Payment Receipt Submitted</span>
        </div>
        <div className="text-sm text-blue-600">
          Your payment receipt has been uploaded and is currently being reviewed by our admin team. 
          You'll be notified once verification is complete (usually within 24 hours).
        </div>
        {receiptUrl && (
          <div className="space-y-2">
            <span className="text-xs text-blue-600 font-medium">Uploaded Receipt:</span>
            <img 
              src={receiptUrl} 
              alt="Payment receipt" 
              className="max-w-full h-auto max-h-32 rounded-lg border border-blue-200 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              onClick={() => window.open(receiptUrl, '_blank')}
            />
            <p className="text-xs text-blue-500">Click image to view full size</p>
          </div>
        )}
      </div>
    );
  }

  if (paymentStatus === 'rejected') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">Payment Receipt Rejected</span>
        </div>
        <div className="text-sm text-red-600 mb-3">
          Your payment receipt was not accepted. Please upload a clearer image or valid payment confirmation.
        </div>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#052844]/10 file:text-[#052844] hover:file:bg-[#052844]/20 file:transition-colors file:duration-150"
          />
          {file && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#052844] text-white text-sm rounded-lg hover:bg-[#063a5e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload New Receipt
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default: pending or no payment record
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-amber-700">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm font-semibold">Payment Receipt Required</span>
      </div>
      <div className="text-sm text-amber-600">
        Please upload your payment receipt after sending the payment using any of the methods above.
      </div>
      <div className="space-y-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#052844]/10 file:text-[#052844] hover:file:bg-[#052844]/20 file:transition-colors file:duration-150"
        />
        {file && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#052844] text-white text-sm rounded-lg hover:bg-[#063a5e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Receipt
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentUploadSection;