import React, { useMemo } from 'react';
import { CalendarIcon } from 'lucide-react';
import BookingCalendarCell from './BookingCalendarCell';

// Calendar helper functions
function getMonthDaysGrid(currentMonthDate) {
  const start = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
  const end = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0);
  const startWeekday = (start.getDay() + 6) % 7; // Make Monday = 0
  const daysInMonth = end.getDate();
  const cells = [];
  
  // Leading blank cells
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), day));
  }
  
  // Trailing blank cells to complete weeks
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  
  return cells;
}

function overlaps(date, booking) {
  if (!date || !booking) return false;
  
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  const start = new Date(booking.start_date);
  const end = new Date(booking.end_date);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  return d >= start && d <= end;
}

const CameraMiniCalendar = ({ 
  camera, 
  monthDate, 
  bookings, 
  highlightedDates, 
  selectedPotentialBooking,
  onDateRangeSelect,
  onDayClick,
  onBookingContextMenu,
  isDarkMode,
  showPotentialSidebar 
}) => {
  const cells = useMemo(() => getMonthDaysGrid(monthDate), [monthDate]);
  const label = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Filter bookings to show only confirmed, active, and completed
  const displayBookings = useMemo(() => {
    return bookings.filter(booking => 
      ['confirmed', 'active', 'completed'].includes(booking.rental_status)
    );
  }, [bookings]);

  // Check if a date should be highlighted
  const isDateHighlighted = (date) => {
    if (!date || !highlightedDates.length) return false;
    return highlightedDates.some(highlight => 
      highlight.cameraId === camera.id && 
      highlight.date.toDateString() === date.toDateString()
    );
  };

  // Check if a highlighted date has conflicts with existing bookings
  const hasDateConflicts = (date) => {
    if (!date || !isDateHighlighted(date)) return false;
    
    // Check if this highlighted date overlaps with any confirmed/active bookings
    const dayBookings = displayBookings.filter(booking => overlaps(date, booking));
    return dayBookings.length > 0;
  };

  // Get status color classes
  const getStatusColor = (status) => {
    const baseStyles = 'border';
    if (isDarkMode) {
      switch(status) {
        case 'active': return `${baseStyles} bg-emerald-900/50 border-emerald-700`;
        case 'confirmed': return `${baseStyles} bg-blue-900/50 border-blue-700`;
        case 'completed': return `${baseStyles} bg-slate-700 border-slate-600`;
        default: return `${baseStyles} bg-slate-800 border-slate-700`;
      }
    } else {
      switch(status) {
        case 'active': return `${baseStyles} bg-emerald-200/50 border-emerald-300`;
        case 'confirmed': return `${baseStyles} bg-blue-200/50 border-blue-300`;
        case 'completed': return `${baseStyles} bg-slate-200 border-slate-300`;
        default: return `${baseStyles} bg-slate-100 border-slate-200`;
      }
    }
  };

  // Theme classes
  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-500';
  const iconColor = isDarkMode ? 'text-gray-500' : 'text-slate-400';

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm ${bgColor} ${borderColor}`}>
      {/* Camera Header */}
      <div className={`p-3 flex items-center gap-3 border-b ${borderColor}`}>
        {camera.image_url ? (
          <img 
            src={camera.image_url} 
            alt={camera.name} 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover flex-shrink-0" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
          />
        ) : (
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded flex-shrink-0 ${isDarkMode ? 'bg-gray-700' : 'bg-slate-100'}`} />
        )}
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm sm:text-base truncate ${textColor}`}>
            {camera.name}
            {camera.serial_number && (
              <span className={`ml-2 text-xs font-normal ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                #{camera.serial_number}
              </span>
            )}
          </div>
          <div className={`text-xs ${secondaryTextColor}`}>{label}</div>
        </div>
        <CalendarIcon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
      </div>

      {/* Days of Week Header */}
      <div className={`grid grid-cols-7 text-xs px-2 sm:px-3 pt-2 sm:pt-3 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center font-medium pb-1 sm:pb-2">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 p-2 sm:p-3 pt-1">
        {cells.map((date, idx) => {
          const dayBookings = date ? displayBookings.filter(booking => overlaps(date, booking)) : [];
          const isHighlighted = isDateHighlighted(date);
          const hasConflicts = hasDateConflicts(date);
          
          return (
            <BookingCalendarCell
              key={idx}
              date={date}
              camera={camera}
              bookings={dayBookings}
              isHighlighted={isHighlighted}
              selectedPotentialBooking={selectedPotentialBooking}
              onDateRangeSelect={onDateRangeSelect}
              onDayClick={onDayClick}
              onBookingContextMenu={onBookingContextMenu}
              isDarkMode={isDarkMode}
              hasConflicts={hasConflicts}
            />
          );
        })}
      </div>
    </div>
  );
};

const BookingCalendarGrid = ({
  cameras,
  monthDate,
  bookingsByCamera,
  highlightedDates,
  selectedPotentialBooking,
  onDateRangeSelect,
  onDayClick,
  onBookingContextMenu,
  isDarkMode,
  showPotentialSidebar
}) => {
  // Responsive grid columns based on screen size and sidebar state
  const getGridCols = () => {
    if (showPotentialSidebar) {
      // When sidebar is shown: 1 col on mobile, 2 on large screens
      return 'grid-cols-1 lg:grid-cols-2';
    } else {
      // When no sidebar: 1 col on mobile, 3 on tablet, 4 on desktop
      return 'grid-cols-1 md:grid-cols-3 xl:grid-cols-4';
    }
  };

  return (
    <div className={`grid gap-3 sm:gap-4 ${getGridCols()} transition-all duration-300`}>
      {cameras.map((camera) => (
        <CameraMiniCalendar
          key={camera.id}
          camera={camera}
          monthDate={monthDate}
          bookings={bookingsByCamera[camera.id] || []}
          highlightedDates={highlightedDates}
          selectedPotentialBooking={selectedPotentialBooking}
          onDateRangeSelect={onDateRangeSelect}
          onDayClick={onDayClick}
          onBookingContextMenu={onBookingContextMenu}
          isDarkMode={isDarkMode}
          showPotentialSidebar={showPotentialSidebar}
        />
      ))}
    </div>
  );
};

export default BookingCalendarGrid;
