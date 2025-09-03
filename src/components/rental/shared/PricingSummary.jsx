import React from 'react';

const PricingSummary = ({ calculatedPrice, isMobile = false }) => {
  if (!calculatedPrice) return null;

  const summaryClass = isMobile 
    ? "bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
    : "bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-md mx-auto";

  return (
    <div className="mb-5">
      <div className={summaryClass}>
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Rental Summary
          </h3>
        </div>
        
        {/* Breakdown Details */}
        <div className="px-4 py-3 space-y-3">
          {/* Rental Period */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Rental Period</span>
            <span className="font-medium text-gray-900">
              {calculatedPrice.days} {calculatedPrice.days === 1 ? 'day' : 'days'}
            </span>
          </div>

          {/* Rate Type and Per Day Price */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Rate ({calculatedPrice.days >= 4 ? 'Discounted' : 'Standard'})
            </span>
            <span className="font-medium text-gray-900">
              ₱{calculatedPrice.pricePerDay.toFixed(2)}/day
            </span>
          </div>

          {/* Desktop-only additional details */}
          {!isMobile && (
            <>
              {/* Discount Indicator */}
              {calculatedPrice.days >= 4 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-600 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                    Long-term Discount
                  </span>
                  <span className="text-green-600 font-medium">Applied</span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-100"></div>

              {/* Subtotal Calculation */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  {calculatedPrice.days} × ₱{calculatedPrice.pricePerDay.toFixed(2)}
                </span>
                <span className="font-medium text-gray-900">
                  ₱{calculatedPrice.total.toFixed(2)}
                </span>
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900">Total Amount</span>
                  <span className="text-lg font-bold text-blue-600">
                    ₱{calculatedPrice.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingSummary;
