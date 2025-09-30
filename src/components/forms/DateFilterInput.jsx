// src/components/DateFilterInput.jsx
import React from "react";

const DateFilterInput = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minStartDate = null,
  minEndDate = null,
  disabled = false,
  label = "Rental Period",
  idPrefix = "date-filter",
}) => {
  // Calculate minimum start date based on Philippines timezone
  const getMinStartDate = () => {
    if (minStartDate) return minStartDate;
    
    // Get current time in Philippines (UTC+8)
    const now = new Date();
    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    
    // If it's past 5 PM (17:00) in Philippines, users cannot book for today
    const cutoffHour = 17;
    const isAfterCutoff = philippinesTime.getHours() >= cutoffHour;
    
    // If after 5 PM, minimum date is tomorrow; otherwise, today
    const minDate = new Date(philippinesTime);
    if (isAfterCutoff) {
      minDate.setDate(minDate.getDate() + 1);
    }
    
    return minDate.toISOString().split("T")[0];
  };

  const calculatedMinStartDate = getMinStartDate();
  const calculatedMinEndDate = minEndDate || startDate || calculatedMinStartDate;

  return (
    <div className="w-full space-y-3">
      {/* Start Date */}
      <div className="relative">
        <label className="block text-xs text-gray-600 mb-1.5">Start Date</label>
        <input
          type="date"
          id={`${idPrefix}-start-date`}
          value={startDate}
          onChange={onStartDateChange}
          min={calculatedMinStartDate}
          disabled={disabled}
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#052844] focus:border-[#052844] disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-150"
        />
      </div>

      {/* End Date */}
      <div className="relative">
        <label className="block text-xs text-gray-600 mb-1.5">End Date</label>
        <input
          type="date"
          id={`${idPrefix}-end-date`}
          value={endDate}
          onChange={onEndDateChange}
          min={calculatedMinEndDate}
          disabled={disabled}
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#052844] focus:border-[#052844] disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-150"
        />
      </div>
    </div>
  );
};

export default DateFilterInput;