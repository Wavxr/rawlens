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
  onDateRangeSelect,
  onDayClick,
  onBookingContextMenu,
  isDarkMode,
  hasConflicts // Add this prop to indicate conflicts
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  if (!date) {
    // Empty cell for padding
    const emptyBg = isDarkMode ? 'bg-gray-900' : 'bg-slate-50';
    return <div className={`h-12 sm:h-14 md:h-16 ${emptyBg}`} />;
  }

  const dayNumber = date.getDate();
  const hasBookings = bookings.length > 0;

  // Create tooltip content with all booking information
  const getTooltipContent = () => {
    if (!hasBookings) return null;
    
    return (
      <div className="space-y-2">
        {bookings.map(booking => {
          const customerName = booking.customer_name || 
                             (booking.users ? `${booking.users.first_name} ${booking.users.last_name || ''}`.trim() : '') ||
                             'Unknown User';
          const startDate = new Date(booking.start_date).toLocaleDateString();
          const endDate = new Date(booking.end_date).toLocaleDateString();
          const status = booking.rental_status;
          
          return (
            <div key={booking.id} className="text-left">
              <div className="font-medium text-sm">{customerName}</div>
              <div className="text-xs opacity-90">
                {startDate} - {endDate}
              </div>
              <div className="text-xs capitalize opacity-75">
                Status: {status}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Handle mouse down for drag selection
  const handleMouseDown = (e) => {
    if (hasBookings) return; // Don't start selection on booked dates
    
    e.preventDefault();
    setIsSelecting(true);
    setDragStart(date);
  };

  // Handle mouse enter during drag
  const handleMouseEnter = () => {
    if (isSelecting && dragStart && !hasBookings) {
      // Could implement visual drag feedback here
    }
  };

  // Handle mouse up to complete selection
  const handleMouseUp = () => {
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
    if (isLongPressing) {
      setIsLongPressing(false);
      return;
    }

    if (hasBookings) {
      onDayClick(camera, date, bookings);
    } else {
      // Single date selection for booking creation - use local date to avoid timezone issues
      const formattedDate = formatDateForInput(date);
      onDateRangeSelect(camera, formattedDate, formattedDate);
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (hasBookings && onBookingContextMenu) {
      // For simplicity, use the first booking if multiple exist
      onBookingContextMenu(e, bookings[0]);
    }
  };

  // Handle long press for mobile context menu
  const handleTouchStart = (e) => {
    if (hasBookings && onBookingContextMenu) {
      const timer = setTimeout(() => {
        setIsLongPressing(true);
        // Trigger haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        // Create a synthetic mouse event for the context menu
        const touch = e.touches[0];
        const syntheticEvent = {
          preventDefault: () => {},
          clientX: touch.clientX,
          clientY: touch.clientY
        };
        onBookingContextMenu(syntheticEvent, bookings[0]);
      }, 1000); // 1 second long press

      setLongPressTimer(timer);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    // Reset long press state after a short delay
    setTimeout(() => setIsLongPressing(false), 100);
  };

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
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
      className={`relative h-12 sm:h-14 md:h-16 rounded-md sm:rounded-lg border flex flex-col items-center justify-between p-0.5 sm:p-1 transition ${cellClass}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => {
        handleMouseEnter();
        if (hasBookings) setShowTooltip(true);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
      }}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Day number and booking indicator */}
      <div className={`w-full flex justify-between items-center text-[10px] sm:text-[11px] ${dayTextColor}`}>
        <span className="font-medium">{dayNumber}</span>
        {hasBookings && (
          <span className="inline-flex items-center gap-0.5 sm:gap-1">
            <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
              bookings.some(b => b.rental_status === 'active') 
                ? getDotColor('active')
                : bookings.some(b => b.rental_status === 'confirmed')
                ? getDotColor('confirmed')
                : getDotColor('completed')
            }`} />
            <span className="text-[9px] sm:text-[10px]">{bookings.length}</span>
          </span>
        )}
      </div>

      {/* Booking details - adapted for mobile */}
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
              className={`truncate text-[8px] sm:text-[9px] md:text-[10px] px-0.5 sm:px-1 py-0.5 rounded border ${
                isDarkMode ? 'bg-gray-700' : 'bg-white'
              } ${bookingTextColor(booking.rental_status)} ${bookingBorderColor(booking.rental_status)}`}
              title={`${customerName} (${startDay}-${endDay})`}
            >
              <span className="hidden sm:inline">{startDay}–{endDay} </span>
              <span className="truncate">{customerName.split(' ')[0]}</span>
            </div>
          );
        })}
        
        {bookings.length > 2 && (
          <div className={`text-[8px] sm:text-[9px] md:text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
            +{bookings.length - 2}
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      {showTooltip && hasBookings && (
        <div className={`
          absolute z-50 bottom-full mb-2 left-1/2 transform -translate-x-1/2
          px-3 py-2 rounded-lg shadow-lg border min-w-48 max-w-64
          ${isDarkMode 
            ? 'bg-gray-800 border-gray-600 text-white' 
            : 'bg-white border-gray-200 text-gray-800'
          }
          ${getTooltipContent() ? 'block' : 'hidden'}
        `}>
          {getTooltipContent()}
          {/* Tooltip arrow */}
          <div className={`
            absolute top-full left-1/2 transform -translate-x-1/2
            border-4 border-transparent
            ${isDarkMode ? 'border-t-gray-800' : 'border-t-white'}
          `} />
        </div>
      )}
    </button>
  );
};

export default BookingCalendarCell;
