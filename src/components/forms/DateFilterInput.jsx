// src/components/DateFilterInput.jsx
import React from "react";

const DateFilterInput = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minStartDate = new Date().toISOString().split("T")[0],
  minEndDate = null,
  disabled = false,
  label = "Rental Period",
  idPrefix = "date-filter",
}) => {
  const calculatedMinEndDate = minEndDate || startDate || minStartDate;

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
          min={minStartDate}
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
