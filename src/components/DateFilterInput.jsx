// src/components/DateFilterInput.jsx
import React from 'react';
import { Calendar } from 'lucide-react';

const DateFilterInput = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minStartDate = new Date().toISOString().split('T')[0],
  minEndDate = null, 
  disabled = false,
  label = "Rental Period",
  idPrefix = "date-filter"
}) => {
  const calculatedMinEndDate = minEndDate || startDate || minStartDate;

  return (
    <div className="lg:col-span-2">
      <label htmlFor={`${idPrefix}-start-date`} className="block text-xs font-semibold text-gray-700 mb-2 flex items-center uppercase tracking-wide">
        <Calendar className="mr-2 h-3.5 w-3.5 text-blue-500" />
        {label}
      </label>
      <div className="flex rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
        <input
          type="date"
          id={`${idPrefix}-start-date`}
          value={startDate}
          onChange={onStartDateChange}
          className="flex-1 min-w-0 py-2.5 px-3 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 bg-white"
          min={minStartDate}
          disabled={disabled}
        />
        <div className="bg-gray-50 px-3 flex items-center">
          <span className="text-gray-400 text-sm">→</span>
        </div>
        <input
          type="date"
          id={`${idPrefix}-end-date`}
          value={endDate}
          onChange={onEndDateChange}
          className="flex-1 min-w-0 py-2.5 px-3 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 bg-white"
          min={calculatedMinEndDate} 
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default DateFilterInput;