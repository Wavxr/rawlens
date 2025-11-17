const PricingSummary = ({ calculatedPrice, isMobile = false }) => {
  if (!calculatedPrice) return null

  const summaryClass = isMobile
    ? "bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
    : "bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-md mx-auto"

  return (
    <div className="mb-5">
      <div className={summaryClass}>
        <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center uppercase tracking-wide">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
            Rental Summary
          </h3>
        </div>

        {/* Breakdown Details */}
        <div className="px-5 py-4 space-y-3">
          {/* Rental Period */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-neutral-600">Rental Period</span>
            <span className="font-semibold text-neutral-900">
              {calculatedPrice.days} {calculatedPrice.days === 1 ? "day" : "days"}
            </span>
          </div>

          {/* Rate Type and Per Day Price */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-neutral-600">Rate ({calculatedPrice.days >= 4 ? "Discounted" : "Standard"})</span>
            <span className="font-semibold text-neutral-900">₱{calculatedPrice.pricePerDay.toFixed(2)}/day</span>
          </div>

          {/* Desktop-only additional details */}
          {!isMobile && (
            <>
              {/* Discount Indicator */}
              {calculatedPrice.days >= 4 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-emerald-600 flex items-center font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                    Long-term Discount
                  </span>
                  <span className="text-emerald-600 font-semibold">Applied</span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-neutral-100"></div>

              {/* Subtotal Calculation */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-600">
                  {calculatedPrice.days} × ₱{calculatedPrice.pricePerDay.toFixed(2)}
                </span>
                <span className="font-semibold text-neutral-900">₱{calculatedPrice.total.toFixed(2)}</span>
              </div>

              {/* Total */}
              <div className="border-t border-neutral-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-neutral-900">Total Amount</span>
                  <span className="text-xl font-bold text-emerald-600">₱{calculatedPrice.total.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}

          {/* Mobile-only additional details */}
          {isMobile && (
            <>
              {/* Discount Indicator */}
              {calculatedPrice.days >= 4 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-emerald-600 flex items-center font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                    Long-term Discount
                  </span>
                  <span className="text-emerald-600 font-semibold">Applied</span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-neutral-100"></div>

              {/* Subtotal Calculation */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-600">
                  {calculatedPrice.days} × ₱{calculatedPrice.pricePerDay.toFixed(2)}
                </span>
                <span className="font-semibold text-neutral-900">₱{calculatedPrice.total.toFixed(2)}</span>
              </div>

              {/* Total */}
              <div className="border-t border-neutral-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-neutral-900">Total Amount</span>
                  <span className="text-xl font-bold text-emerald-600">₱{calculatedPrice.total.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PricingSummary
