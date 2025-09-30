import React, { useState } from 'react';
import { CreditCard, Copy, Check, Smartphone, Building, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const PaymentDetailsComponent = ({ rental, className = "" }) => {
  const [copiedField, setCopiedField] = useState(null);
  const [activeMethod, setActiveMethod] = useState('SEABANK');

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
      type: 'SEABANK',
      icon: Building,
      details: [
        { label: 'Account Number', value: '13127921866', copyable: true },
        { label: 'Account Name', value: 'Rolen Christoper Paradeza', copyable: false }
      ],
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      logo: '/seabank.png'
    },
    {
      type: 'GCash',
      icon: Smartphone,
      details: [
        { label: 'Mobile Number', value: '09613986032', copyable: true },
        { label: 'Account Name', value: 'Rolen Christoper Paradeza', copyable: false }
      ],
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      qrCode: '/gcash.png'
    },
    {
      type: 'Maya',
      icon: Smartphone,
      details: [
        { label: 'Mobile Number', value: '09613986032', copyable: true },
        { label: 'Account Name', value: 'Rolen Christoper Paradeza', copyable: false }
      ],
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'from-emerald-50 to-emerald-100',
      qrCode: '/maya.png'
    }
  ];

  const currentMethod = paymentMethods.find(m => m.type === activeMethod);

  return (
    <div className={`space-y-3 lg:space-y-6 ${className}`}>
      {/* Main Grid Layout */}
      <div className="grid lg:grid-cols-5 gap-3 lg:gap-6">
        {/* Left Side - Amount & Instructions */}
        <div className="lg:col-span-2 space-y-3 lg:space-y-6">
          {/* Payment Amount */}
          <div className="bg-gradient-to-br from-[#052844] to-[#063a5e] rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm">
            <div className="flex items-start gap-2 lg:gap-3 mb-3 lg:mb-4">
              <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-bold text-white mb-0.5">Payment Details</h3>
                <p className="text-xs text-blue-100">Complete your payment to confirm booking</p>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-3 lg:p-4 backdrop-blur-sm border border-white/20">
              <span className="text-xs font-medium text-blue-100 block mb-1.5">Total Amount to Pay</span>
              <span className="text-2xl lg:text-3xl font-bold text-white">₱{rental?.total_price?.toFixed(2) || '0.00'}</span>
              <div className="text-xs text-blue-100 mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-white/20">
                <div className="font-medium text-white text-sm">{rental?.cameras?.name}</div>
                <div className="opacity-90 mt-0.5">{rental?.start_date} to {rental?.end_date}</div>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg lg:rounded-xl p-3 lg:p-5 shadow-sm">
            <div className="flex items-start gap-2 lg:gap-3">
              <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg bg-[#052844] flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm lg:text-base font-bold text-gray-900 mb-2 lg:mb-3">Payment Instructions</h4>
                <ol className="text-xs lg:text-sm text-gray-700 space-y-1.5 lg:space-y-2 list-none">
                  <li className="flex items-start gap-2 lg:gap-2.5">
                    <span className="flex items-center justify-center w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-[#052844] text-white text-[10px] lg:text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                    <span>Send the exact amount (₱{rental?.total_price?.toFixed(2)}) to any payment method</span>
                  </li>
                  <li className="flex items-start gap-2 lg:gap-2.5">
                    <span className="flex items-center justify-center w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-[#052844] text-white text-[10px] lg:text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                    <span>Take a clear screenshot of your payment confirmation</span>
                  </li>
                  <li className="flex items-start gap-2 lg:gap-2.5">
                    <span className="flex items-center justify-center w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-[#052844] text-white text-[10px] lg:text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                    <span>Upload the receipt using the upload button below</span>
                  </li>
                  <li className="flex items-start gap-2 lg:gap-2.5">
                    <span className="flex items-center justify-center w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-[#052844] text-white text-[10px] lg:text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                    <span>Wait for admin verification (within 24 hours)</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Payment Methods */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-lg lg:rounded-xl shadow-sm overflow-hidden">
          {/* Method Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.type}
                  onClick={() => setActiveMethod(method.type)}
                  className={`flex-1 flex items-center justify-center gap-1.5 lg:gap-2 py-2.5 lg:py-3.5 px-2 lg:px-4 font-semibold text-xs lg:text-sm transition-all duration-200 ${
                    activeMethod === method.type
                      ? 'bg-white text-[#052844] border-b-2 border-[#052844]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">{method.type}</span>
                  <span className="sm:hidden text-[10px]">{method.type}</span>
                </button>
              );
            })}
          </div>

          {/* Method Content */}
          <div className="p-3 lg:p-6">
            <div className="space-y-3 lg:space-y-4">
              {currentMethod.details.map((detail, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 lg:p-4 border border-gray-200">
                  <span className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5 lg:mb-2">{detail.label}</span>
                  <div className="flex items-center justify-between gap-2 lg:gap-3">
                    <span className="text-sm lg:text-base font-bold text-gray-900 break-all">{detail.value}</span>
                    {detail.copyable && (
                      <button
                        onClick={() => copyToClipboard(detail.value, detail.label)}
                        className="flex items-center justify-center w-7 h-7 lg:w-9 lg:h-9 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 transition-all duration-150 flex-shrink-0"
                        title={`Copy ${detail.label}`}
                      >
                        {copiedField === detail.label ? (
                          <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-900" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Logo Display for SEABANK */}
              {currentMethod.logo && (
                <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-200 flex justify-center">
                  <div className="bg-white rounded-lg p-3 lg:p-4 border border-gray-200 inline-block">
                    <img
                      src={currentMethod.logo}
                      alt={`${currentMethod.type} Logo`}
                      className="h-16 lg:h-24 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* QR Code */}
              {currentMethod.qrCode && (
                <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-200">
                  <div className="flex flex-col items-center gap-2 lg:gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 lg:p-4 border border-gray-200">
                      <img
                        src={currentMethod.qrCode}
                        alt={`${currentMethod.type} QR Code`}
                        className="w-32 h-32 lg:w-44 lg:h-44 object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsComponent;