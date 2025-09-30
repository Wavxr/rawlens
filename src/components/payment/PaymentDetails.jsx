import React, { useState } from 'react';
import { CreditCard, Copy, Check, Smartphone, Building, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const PaymentDetailsComponent = ({ rental, className = "" }) => {
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const paymentMethods = [
    {
      type: 'GCash',
      icon: Smartphone,
      details: [
        { label: 'GCash Number', value: '09171234567', copyable: true },
        { label: 'Account Name', value: 'RawLens Camera Rental', copyable: false }
      ],
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100'
    },
    {
      type: 'Bank Transfer',
      icon: Building,
      details: [
        { label: 'Bank Name', value: 'Bank of the Philippine Islands (BPI)', copyable: false },
        { label: 'Account Number', value: '1234-5678-90', copyable: true },
        { label: 'Account Name', value: 'RawLens Camera Rental Co.', copyable: false }
      ],
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100'
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#052844] flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
          <p className="text-sm text-gray-600">Send your payment using any of these methods</p>
        </div>
      </div>

      {/* Payment Amount */}
      <div className="bg-gradient-to-r from-[#052844]/10 to-[#052844]/5 border border-[#052844]/20 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#052844]">Total Amount to Pay:</span>
          <span className="text-2xl font-bold text-[#052844]">₱{rental?.total_price?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="text-xs text-[#052844]/70 mt-1">
          For {rental?.cameras?.name} rental ({rental?.start_date} to {rental?.end_date})
        </div>
      </div>

      {/* Payment Methods */}
      <div className="grid gap-4 md:grid-cols-2">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          return (
            <div key={method.type} className={`bg-gradient-to-br ${method.bgColor} border border-gray-200 rounded-lg p-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${method.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">{method.type}</h4>
              </div>
              
              <div className="space-y-2">
                {method.details.map((detail, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-600 flex-shrink-0">{detail.label}:</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate">{detail.value}</span>
                      {detail.copyable && (
                        <button
                          onClick={() => copyToClipboard(detail.value, detail.label)}
                          className="flex items-center justify-center w-6 h-6 rounded-md bg-white/50 hover:bg-white/80 border border-gray-200 transition-colors flex-shrink-0"
                          title={`Copy ${detail.label}`}
                        >
                          {copiedField === detail.label ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-amber-900 mb-2">Payment Instructions</h4>
            <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
              <li>Send the exact amount (₱{rental?.total_price?.toFixed(2)}) to any of the payment methods above</li>
              <li>Take a clear screenshot or photo of your payment confirmation</li>
              <li>Upload the receipt using the upload button below</li>
              <li>Wait for admin verification (usually within 24 hours)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsComponent;