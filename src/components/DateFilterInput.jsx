// src/components/DateFilterInput.jsx
import React from 'react';
import { Calendar } from 'lucide-react';

const DateFilterInput = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minStartDate = new Date().toISOString().split('T')[0],
  minEndDate, // Should be calculated based on startDate if needed
  disabled = false,
  label = "Rental Period",
  idPrefix = "date-filter" // To ensure unique IDs if used multiple times
}) => {
  // If minEndDate is not provided, calculate it based on startDate
  const calculatedMinEndDate = minEndDate || (startDate ? new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0] : minStartDate);

  return (
    <div className="lg:col-span-2">
      <label htmlFor={`${idPrefix}-start-date`} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
        <Calendar className="mr-1.5 h-4 w-4" />
        {label}
      </label>
      <div className="flex">
        <input
          type="date"
          id={`${idPrefix}-start-date`}
          value={startDate}
          onChange={onStartDateChange}
          className="flex-1 min-w-0 p-3 border border-r-0 border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500"
          min={minStartDate}
          disabled={disabled}
        />
        <div className="bg-gray-100 border border-gray-300 border-l-0 border-r-0 px-3 flex items-center">
          <span className="text-gray-500">to</span>
        </div>
        <input
          type="date"
          id={`${idPrefix}-end-date`}
          value={endDate}
          onChange={onEndDateChange}
          className="flex-1 min-w-0 p-3 border border-l-0 border-gray-300 rounded-r-lg focus:ring-blue-500 focus:border-blue-500"
          min={calculatedMinEndDate}
          disabled={disabled || !startDate} // Disable end date if start date is not selected
        />
      </div>
    </div>
  );
};

export default DateFilterInput;