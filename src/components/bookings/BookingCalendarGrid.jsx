import React, { useMemo } from 'react';
import { CalendarIcon } from 'lucide-react';
import BookingCalendarCell from './BookingCalendarCell';

function getMonthGridDates(monthDate) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  // Adjust weekday so that Monday = 0
  const mondayStartOffset = (firstOfMonth.getDay() + 6) % 7;

  const totalDays = lastOfMonth.getDate();
  const gridDates = [];

  for (let i = 0; i < mondayStartOffset; i++) gridDates.push(null);
  for (let day = 1; day <= totalDays; day++) {
    gridDates.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }
  while (gridDates.length % 7 !== 0) gridDates.push(null);

  return gridDates;
}

function isDateWithinBooking(date, booking) {
  if (!date || !booking) return false;

  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  const bookingStart = new Date(booking.start_date);
  const bookingEnd = new Date(booking.end_date);
  bookingStart.setHours(0, 0, 0, 0);
  bookingEnd.setHours(0, 0, 0, 0);

  return normalizedDate >= bookingStart && normalizedDate <= bookingEnd;
}

function useFilteredBookings(bookings) {
  return useMemo(
    () => bookings.filter(({ rental_status }) =>
      ['confirmed', 'active', 'completed'].includes(rental_status)
    ),
    [bookings]
  );
}

function useThemeClasses(isDarkMode) {
  return {
    background: isDarkMode ? 'bg-gray-800' : 'bg-white',
    border: isDarkMode ? 'border-gray-700' : 'border-slate-200',
    primaryText: isDarkMode ? 'text-gray-100' : 'text-slate-800',
    secondaryText: isDarkMode ? 'text-gray-400' : 'text-slate-500',
    icon: isDarkMode ? 'text-gray-500' : 'text-slate-400',
    placeholder: isDarkMode ? 'bg-gray-700' : 'bg-slate-100',
  };
}

function CameraMiniCalendar({
  camera,
  monthDate,
  bookings,
  highlightedDates,
  selectedPotentialBooking,
  onDateRangeSelect,
  onDayClick,
  onBookingContextMenu,
  isDarkMode,
}) {
  const monthGridDates = useMemo(() => getMonthGridDates(monthDate), [monthDate]);
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const confirmedBookings = useFilteredBookings(bookings);
  const theme = useThemeClasses(isDarkMode);

  const isHighlighted = (date) =>
    !!date &&
    highlightedDates.some(
      (highlight) =>
        highlight.cameraId === camera.id &&
        highlight.date.toDateString() === date.toDateString()
    );

  const hasBookingConflict = (date) =>
    !!date &&
    isHighlighted(date) &&
    confirmedBookings.some((booking) => isDateWithinBooking(date, booking));

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm ${theme.background} ${theme.border}`}>
      <div className={`p-3 flex items-center gap-3 border-b ${theme.border}`}>
        {camera.image_url ? (
          <img
            src={camera.image_url}
            alt={camera.name}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded flex-shrink-0 ${theme.placeholder}`} />
        )}

        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm sm:text-base truncate ${theme.primaryText}`}>
            {camera.name}
            {camera.serial_number && (
              <span className={`ml-2 text-xs font-normal ${theme.secondaryText}`}>
                #{camera.serial_number}
              </span>
            )}
          </div>
          <div className={`text-xs ${theme.secondaryText}`}>{monthLabel}</div>
        </div>

        <CalendarIcon className={`w-4 h-4 flex-shrink-0 ${theme.icon}`} />
      </div>

      <div className={`grid grid-cols-7 text-xs px-2 sm:px-3 pt-2 sm:pt-3 ${theme.secondaryText}`}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday) => (
          <div key={weekday} className="text-center font-medium pb-1 sm:pb-2">
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 p-2 sm:p-3 pt-1">
        {monthGridDates.map((date, index) => {
          const dayBookings = date
            ? confirmedBookings.filter((booking) => isDateWithinBooking(date, booking))
            : [];

          return (
            <BookingCalendarCell
              key={index}
              date={date}
              camera={camera}
              bookings={dayBookings}
              isHighlighted={isHighlighted(date)}
              hasConflicts={hasBookingConflict(date)}
              selectedPotentialBooking={selectedPotentialBooking}
              onDateRangeSelect={onDateRangeSelect}
              onDayClick={onDayClick}
              onBookingContextMenu={onBookingContextMenu}
              isDarkMode={isDarkMode}
            />
          );
        })}
      </div>
    </div>
  );
}

function BookingCalendarGrid({
  cameras,
  monthDate,
  bookingsByCamera,
  highlightedDates,
  selectedPotentialBooking,
  onDateRangeSelect,
  onDayClick,
  onBookingContextMenu,
  isDarkMode,
  showPotentialSidebar,
  showExtensionSidebar,
}) {
  const gridLayout =
    showPotentialSidebar || showExtensionSidebar
      ? 'grid-cols-1 lg:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-3 xl:grid-cols-4';

  return (
    <div className={`grid gap-3 sm:gap-4 ${gridLayout} transition-all duration-300`}>
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
        />
      ))}
    </div>
  );
}

export default BookingCalendarGrid;
