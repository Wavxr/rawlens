import React, { useState } from 'react';

// Helper function to format date for input without timezone issues
const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BookingCalendarCell = ({
  date,
  camera,
  bookings,
  isHighlighted,
  selectedPotentialBooking,
  onDateRangeSelect,
  onDayClick,
  isDarkMode,
  hasConflicts // Add this prop to indicate conflicts
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  if (!date) {
    // Empty cell for padding
    const emptyBg = isDarkMode ? 'bg-gray-900' : 'bg-slate-50';
    return <div className={`h-16 ${emptyBg}`} />;
  }

  const dayNumber = date.getDate();
  const hasBookings = bookings.length > 0;

  // Handle mouse down for drag selection
  const handleMouseDown = (e) => {
    if (hasBookings) return; // Don't start selection on booked dates
    
    e.preventDefault();
    setIsSelecting(true);
    setDragStart(date);
  };

  // Handle mouse enter during drag
  const handleMouseEnter = (e) => {
    if (isSelecting && dragStart && !hasBookings) {
      // Could implement visual drag feedback here
    }
  };

  // Handle mouse up to complete selection
  const handleMouseUp = (e) => {
    if (isSelecting && dragStart) {
      const endDate = date;
      const startDate = dragStart;
      
      // Ensure start date is before end date
      const finalStartDate = startDate <= endDate ? startDate : endDate;
      const finalEndDate = startDate <= endDate ? endDate : startDate;
      
      // Format dates for the callback - use local date to avoid timezone issues
      const formattedStart = formatDateForInput(finalStartDate);
      const formattedEnd = formatDateForInput(finalEndDate);
      
      onDateRangeSelect(camera, formattedStart, formattedEnd);
      
      setIsSelecting(false);
      setDragStart(null);
    }
  };

  // Handle click for viewing booking details or single date selection
  const handleClick = () => {
    if (hasBookings) {
      onDayClick(camera, date, bookings);
    } else {
      // Single date selection for booking creation - use local date to avoid timezone issues
      const formattedDate = formatDateForInput(date);
      onDateRangeSelect(camera, formattedDate, formattedDate);
    }
  };

  // Determine cell styling based on booking status and conflicts
  let cellClass = '';
  let statusColor = '';
  
  // Check for conflicts with existing bookings for this date
  const hasDateConflicts = hasConflicts || (isHighlighted && hasBookings);
  
  if (hasDateConflicts) {
    // Conflict styling - prominent red
    statusColor = isDarkMode 
      ? 'bg-red-900/70 border-red-600 border-2' 
      : 'bg-red-200/80 border-red-500 border-2';
    cellClass = `${statusColor} cursor-pointer hover:opacity-90`;
  } else if (hasBookings) {
    // Get the highest priority status
    const statuses = [...new Set(bookings.map(b => b.rental_status))];
    
    if (statuses.includes('active')) {
      statusColor = isDarkMode ? 'bg-emerald-900/50 border-emerald-700' : 'bg-emerald-200/50 border-emerald-300';
    } else if (statuses.includes('confirmed')) {
      statusColor = isDarkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-200/50 border-blue-300';
    } else if (statuses.includes('completed')) {
      statusColor = isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-200 border-slate-300';
    }
    
    cellClass = `${statusColor} cursor-pointer hover:opacity-80`;
  } else {
    // Empty date - available for booking
    const emptyBg = isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-slate-50';
    const emptyBorder = isDarkMode ? 'border-gray-700' : 'border-slate-200';
    cellClass = `${emptyBg} ${emptyBorder} cursor-pointer`;
  }

  // Add highlight styling for potential booking dates (sharp green)
  if (isHighlighted && !hasDateConflicts) {
    const highlightStyle = isDarkMode 
      ? 'bg-green-800/80 border-green-500 border-2' 
      : 'bg-green-200/90 border-green-600 border-2';
    cellClass = `${highlightStyle} cursor-pointer hover:opacity-90`;
  }

  // Text colors - adjust based on background
  let dayTextColor = isDarkMode ? 'text-gray-300' : 'text-slate-600';
  
  // Override text color for highlighted and conflict states
  if (hasDateConflicts) {
    dayTextColor = isDarkMode ? 'text-red-100' : 'text-red-900';
  } else if (isHighlighted && !hasBookings) {
    dayTextColor = isDarkMode ? 'text-green-100' : 'text-green-900';
  }
  
  const bookingTextColor = (status) => {
    if (hasDateConflicts) return isDarkMode ? 'text-red-100' : 'text-red-900';
    if (status === 'active') return isDarkMode ? 'text-emerald-200' : 'text-emerald-800';
    if (status === 'confirmed') return isDarkMode ? 'text-blue-200' : 'text-blue-800';
    return isDarkMode ? 'text-slate-300' : 'text-slate-700';
  };
  
  const bookingBorderColor = (status) => {
    if (hasDateConflicts) return isDarkMode ? 'border-red-700' : 'border-red-600';
    if (status === 'active') return isDarkMode ? 'border-emerald-800/50' : 'border-emerald-200';
    if (status === 'confirmed') return isDarkMode ? 'border-blue-800/50' : 'border-blue-200';
    return isDarkMode ? 'border-slate-700' : 'border-slate-200';
  };

  // Dot color for booking indicators
  const getDotColor = (status) => {
    if (status === 'active') return isDarkMode ? 'bg-emerald-500' : 'bg-emerald-500';
    if (status === 'confirmed') return isDarkMode ? 'bg-blue-500' : 'bg-blue-500';
    return isDarkMode ? 'bg-slate-400' : 'bg-slate-500';
  };

  return (
    <button
      className={`h-16 rounded-lg border flex flex-col items-center justify-between p-1 transition ${cellClass}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {/* Day number and booking indicator */}
      <div className={`w-full flex justify-between items-center text-[11px] ${dayTextColor}`}>
        <span>{dayNumber}</span>
        {hasBookings && (
          <span className="inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${
              bookings.some(b => b.rental_status === 'active') 
                ? getDotColor('active')
                : bookings.some(b => b.rental_status === 'confirmed')
                ? getDotColor('confirmed')
                : getDotColor('completed')
            }`} />
            {bookings.length}
          </span>
        )}
      </div>

      {/* Booking details */}
      <div className="w-full space-y-0.5 overflow-hidden">
        {bookings.slice(0, 2).map(booking => {
          const customerName = booking.customer_name || 
                             (booking.users ? `${booking.users.first_name || ''}`.trim() : '') ||
                             'User';
          const startDay = new Date(booking.start_date).getDate();
          const endDay = new Date(booking.end_date).getDate();
          
          return (
            <div 
              key={booking.id} 
              className={`truncate text-[10px] px-1 py-0.5 rounded border ${
                isDarkMode ? 'bg-gray-700' : 'bg-white'
              } ${bookingTextColor(booking.rental_status)} ${bookingBorderColor(booking.rental_status)}`}
              title={`${customerName} (${startDay}-${endDay})`}
            >
              {startDay}–{endDay} {customerName}
            </div>
          );
        })}
        
        {bookings.length > 2 && (
          <div className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
            +{bookings.length - 2} more
          </div>
        )}
      </div>
    </button>
  );
};

export default BookingCalendarCell;
