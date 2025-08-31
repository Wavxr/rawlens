import React, { useState, useEffect } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';
import { uploadPaymentReceipt, getPaymentReceiptUrl } from '../../services/paymentService';
import { toast } from 'react-toastify';

const PaymentUploadSection = ({ rental, onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);

  // Get fresh signed URL for receipt if it exists
  useEffect(() => {
    if (rental.payment_receipt_url && (rental.payment_status === 'submitted' || rental.payment_status === 'rejected')) {
      const fetchReceiptUrl = async () => {
        const result = await getPaymentReceiptUrl(rental.id);
        if (result.success) {
          setReceiptUrl(result.url);
        }
      };
      fetchReceiptUrl();
    }
  }, [rental.id, rental.payment_receipt_url, rental.payment_status]);

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
      const result = await uploadPaymentReceipt(rental.id, file);
      if (result.success) {
        onUploadComplete();
        toast.success('Payment receipt uploaded successfully!');
        setFile(null);
      } else {
        toast.error('Failed to upload receipt: ' + result.error);
      }
    } catch (error) {
      toast.error('Failed to upload receipt');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  if (rental.payment_status === 'verified') {
    return (
      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Payment verified by admin</span>
        </div>
      </div>
    );
  }

  if (rental.payment_status === 'submitted') {
    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Payment receipt under review</span>
        </div>
        {receiptUrl && (
          <div className="mt-2">
            <img 
              src={receiptUrl} 
              alt="Payment receipt" 
              className="max-w-full h-auto max-h-32 rounded border cursor-pointer"
              onClick={() => window.open(receiptUrl, '_blank')}
            />
          </div>
        )}
      </div>
    );
  }

  if (rental.payment_status === 'rejected') {
    return (
      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Payment rejected - please upload a new receipt</span>
        </div>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? (
                <>Loading...</>
              ) : (
                <>
                  <Upload className="w-3 h-3" />
                  Upload New Receipt
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center gap-2 text-yellow-700 mb-2">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Payment receipt required</span>
      </div>
      <div className="space-y-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isUploading ? (
              <>Loading...</>
            ) : (
              <>
                <Upload className="w-3 h-3" />
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
