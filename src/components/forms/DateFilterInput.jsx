// src/components/DateFilterInput.jsx
import React from "react";

const DateFilterInput = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minStartDate = null, // We'll calculate this dynamically
  minEndDate = null,
  disabled = false,
  label = "Rental Period",
  idPrefix = "date-filter",
}) => {
  // Calculate minimum start date based on Philippines timezone
  const getMinStartDate = () => {
    if (minStartDate) return minStartDate; // Allow override for admin or other uses
    
    // Get current time in Philippines (UTC+8)
    const now = new Date();
    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    
    // If it's past 5 PM (17:00) in Philippines, users cannot book for today
    const cutoffHour = 17; // 5 PM
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
    <div className="lg:col-span-2">
      {/* Date Picker Container */}
      <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition">
        {/* Start Date */}
        <input
          type="date"
          id={`${idPrefix}-start-date`}
          value={startDate}
          onChange={onStartDateChange}
          min={calculatedMinStartDate}
          disabled={disabled}
          className="flex-1 px-1 py-3 text-sm rounded-l-xl border-0 focus:outline-none focus:ring-0 disabled:bg-gray-100"
        />

        {/* Separator */}
        <span className="px-1 text-gray-400 text-sm">→</span>

        {/* End Date */}
        <input
          type="date"
          id={`${idPrefix}-end-date`}
          value={endDate}
          onChange={onEndDateChange}
          min={calculatedMinEndDate}
          disabled={disabled}
          className="flex-1 px-1 py-3 text-sm rounded-r-xl border-0 focus:outline-none focus:ring-0 disabled:bg-gray-100"
        />
      </div>
    </div>
  );
};

export default DateFilterInput;
