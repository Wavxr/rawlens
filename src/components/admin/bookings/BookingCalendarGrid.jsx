import { useMemo } from 'react';
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
    <div className="rounded-xl border border-gray-700/70 bg-gray-800/80 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-gray-700/70 px-4 py-3">
        {camera.image_url ? (
          <img
            src={camera.image_url}
            alt={camera.name}
            className="h-10 w-10 rounded object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-10 w-10 rounded bg-gray-700/60" />
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-100 sm:text-base">
            {camera.name}
            {camera.serial_number && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                #{camera.serial_number}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">{monthLabel}</div>
        </div>

        <CalendarIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />
      </div>

      <div className="grid grid-cols-7 px-4 pt-3 text-[11px] font-medium uppercase tracking-tight text-gray-400">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday) => (
          <div key={weekday} className="pb-2 text-center">
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 px-4 pb-4 pt-2">
        {monthGridDates.map((date, index) => {
          const dayBookings = date
            ? confirmedBookings.filter((booking) => isDateWithinBooking(date, booking))
            : [];

          return (
            <BookingCalendarCell
              key={`${camera.id}-${index}`}
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
  isPanelOpen = false,
}) {
  const baseGridClass = 'grid grid-cols-1 gap-4 lg:gap-5';
  const gridClass = isPanelOpen
    ? `${baseGridClass} md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3`
    : `${baseGridClass} md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;

  return (
    <div className={gridClass}>
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
