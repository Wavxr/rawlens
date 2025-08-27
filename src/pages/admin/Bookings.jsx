import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Sun, Moon, Plus, Menu } from 'lucide-react';
import { getAllCameras } from '../../services/cameraService';
import { getCalendarBookings, getPotentialBookings } from '../../services/bookingService';
import BookingCalendarGrid from '../../components/bookings/BookingCalendarGrid';
import PotentialBookingsSidebar from '../../components/bookings/PotentialBookingsSidebar';
import MobilePotentialBookingsPanel from '../../components/bookings/MobilePotentialBookingsPanel';
import CreateBookingModal from '../../components/bookings/CreateBookingModal';
import BookingDetailsModal from '../../components/bookings/BookingDetailsModal';
import EditPotentialBookingModal from '../../components/bookings/EditPotentialBookingModal';

// Date helper functions
function startOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addMonths(date, count) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + count);
  return d;
}

function formatISODate(date) {
  return date.toISOString().split('T')[0];
}

function formatDisplay(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function groupBookingsByCamera(bookings = []) {
  return bookings.reduce((acc, booking) => {
    const key = booking.camera_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(booking);
    return acc;
  }, {});
}

const Bookings = () => {
  // Date and navigation state
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Data state
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [calendarBookings, setCalendarBookings] = useState([]);
  const [potentialBookings, setPotentialBookings] = useState([]);
  const [bookingsByCamera, setBookingsByCamera] = useState({});

  // UI state
  const [showPotentialSidebar, setShowPotentialSidebar] = useState(false);
  const [selectedPotentialBooking, setSelectedPotentialBooking] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [highlightedDates, setHighlightedDates] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [error, setError] = useState('');

  // Modal state
  const [createBookingModal, setCreateBookingModal] = useState({
    open: false,
    camera: null,
    dateRange: null
  });
  const [bookingDetailsModal, setBookingDetailsModal] = useState({
    open: false,
    booking: null,
    camera: null
  });
  const [editingBooking, setEditingBooking] = useState(null);

  // Calculate date range for current month
  const monthStartIso = useMemo(() => formatISODate(startOfMonth(monthDate)), [monthDate]);
  const monthEndIso = useMemo(() => formatISODate(endOfMonth(monthDate)), [monthDate]);

  // Load data when month changes
  useEffect(() => {
    loadBookingData();
  }, [monthStartIso, monthEndIso]);

  const loadBookingData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [cameraRes, calendarRes, potentialRes] = await Promise.all([
        getAllCameras(),
        getCalendarBookings(monthStartIso, monthEndIso),
        getPotentialBookings()
      ]);

      // Handle cameras
      if (cameraRes.error) throw new Error(cameraRes.error);
      setCameras(cameraRes.data || []);

      // Handle calendar bookings
      if (!calendarRes.success) throw new Error(calendarRes.error);
      const confirmedBookings = calendarRes.data || [];
      setCalendarBookings(confirmedBookings);
      setBookingsByCamera(groupBookingsByCamera(confirmedBookings));

      // Handle potential bookings
      if (!potentialRes.success) throw new Error(potentialRes.error);
      setPotentialBookings(potentialRes.data || []);

    } catch (e) {
      console.error('Error loading booking data:', e);
      setError(e.message || 'Failed to load booking data');
    } finally {
      setLoading(false);
    }
  };

  // Handle date range selection for booking creation
  const handleDateRangeSelect = (camera, startDate, endDate) => {
    setSelectedDateRange({ camera, startDate, endDate });
    setCreateBookingModal({
      open: true,
      camera,
      dateRange: { startDate, endDate }
    });
    // Close mobile panel when date is selected
    if (window.innerWidth < 1024) { // lg breakpoint
      setShowPotentialSidebar(false);
      clearPotentialSelection();
    }
  };

  // Handle calendar day click to view booking details
  const handleDayClick = (camera, date, bookings) => {
    if (bookings.length === 1) {
      // Show single booking details
      setBookingDetailsModal({
        open: true,
        booking: bookings[0],
        camera
      });
    } else if (bookings.length > 1) {
      // Could implement a list modal for multiple bookings
      console.log('Multiple bookings on this date:', bookings);
    } else {
      // No bookings, could initiate booking creation
      handleDateRangeSelect(camera, date, date);
    }
    // Close mobile panel when calendar is interacted with
    if (window.innerWidth < 1024) { // lg breakpoint
      setShowPotentialSidebar(false);
      clearPotentialSelection();
    }
  };

  // Handle potential booking selection
  const handlePotentialBookingSelect = (booking) => {
    setSelectedPotentialBooking(booking);
    
    // Highlight dates for this potential booking
    const highlightDates = [];
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      highlightDates.push({
        date: new Date(d),
        cameraId: booking.camera_id
      });
    }
    
    setHighlightedDates(highlightDates);
  };

  // Clear potential booking selection
  const clearPotentialSelection = () => {
    setSelectedPotentialBooking(null);
    setHighlightedDates([]);
  };

  // Handle successful booking creation/update
  const handleBookingUpdate = () => {
    loadBookingData(); // Refresh data
    setCreateBookingModal({ open: false, camera: null, dateRange: null });
    setBookingDetailsModal({ open: false, booking: null, camera: null });
  };

  // Handle edit booking
  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
  };

  const handleEditSuccess = () => {
    setEditingBooking(null);
    handleBookingUpdate(); // Refresh the bookings list
  };

  const monthLabel = formatDisplay(monthDate);

  // Theme classes
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-slate-100';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const buttonBg = isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-slate-200';
  const buttonBorder = isDarkMode ? 'border-gray-700' : 'border-slate-300';
  const buttonTextColor = isDarkMode ? 'text-gray-300' : 'text-slate-700';
  const errorBg = isDarkMode ? 'bg-rose-900/30 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700';
  const loadingTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-600';

  return (
    <div className={`p-4 sm:p-6 min-h-screen transition-colors ${bgColor}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Top row - Month Navigation and Create Button */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              className={`p-2 rounded border transition ${buttonBg} ${buttonBorder} ${buttonTextColor}`}
              onClick={() => setMonthDate(prev => addMonths(prev, -1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className={`text-lg sm:text-xl font-semibold ${textColor} min-w-0 text-center`}>
              {monthLabel}
            </div>
            <button
              className={`p-2 rounded border transition ${buttonBg} ${buttonBorder} ${buttonTextColor}`}
              onClick={() => setMonthDate(prev => addMonths(prev, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Create Booking Button - Mobile optimized */}
          <button
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded border transition ${buttonBg} ${buttonBorder} ${buttonTextColor} text-sm sm:text-base`}
            onClick={() => setCreateBookingModal({ open: true, camera: null, dateRange: null })}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Create</span>
            <span className="hidden sm:inline">Booking</span>
          </button>
        </div>

        {/* Bottom row - Control buttons */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Potential Bookings Toggle */}
          <button
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded border transition text-sm sm:text-base ${
              showPotentialSidebar 
                ? (isDarkMode ? 'bg-blue-900 border-blue-700 text-blue-200' : 'bg-blue-100 border-blue-300 text-blue-800')
                : `${buttonBg} ${buttonBorder} ${buttonTextColor}`
            }`}
            onClick={() => {
              setShowPotentialSidebar(!showPotentialSidebar);
              if (showPotentialSidebar) {
                clearPotentialSelection();
              }
            }}
          >
            <Menu className="w-4 h-4" />
            <span className="hidden xs:inline">Potential</span>
            <span className="hidden sm:inline">Bookings</span>
            {potentialBookings.length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                isDarkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-200 text-blue-800'
              }`}>
                {potentialBookings.length}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded border transition ${buttonBg} ${buttonBorder} ${buttonTextColor}`}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`mb-4 p-3 rounded border ${errorBg}`}>
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Calendar Grid */}
        <div className={`transition-all duration-300 ${
          showPotentialSidebar 
            ? 'lg:w-2/3' // On large screens with sidebar
            : 'w-full' // Full width when no sidebar
        }`}>
          {loading ? (
            <div className={`flex items-center justify-center py-20 ${loadingTextColor}`}>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading calendars...
            </div>
          ) : (
            <BookingCalendarGrid
              cameras={cameras}
              monthDate={monthDate}
              bookingsByCamera={bookingsByCamera}
              highlightedDates={highlightedDates}
              selectedPotentialBooking={selectedPotentialBooking}
              onDateRangeSelect={handleDateRangeSelect}
              onDayClick={handleDayClick}
              isDarkMode={isDarkMode}
              showPotentialSidebar={showPotentialSidebar}
            />
          )}
        </div>

        {/* Desktop Potential Bookings Sidebar - Hidden on mobile */}
        {showPotentialSidebar && (
          <div className={`hidden lg:block lg:w-1/3 transition-all duration-300`}>
            <div className="lg:sticky lg:top-6">
              <PotentialBookingsSidebar
                potentialBookings={potentialBookings}
                selectedBooking={selectedPotentialBooking}
                onSelectBooking={handlePotentialBookingSelect}
                onClearSelection={clearPotentialSelection}
                onBookingUpdate={handleBookingUpdate}
                onEditBooking={handleEditBooking}
                cameras={cameras}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Potential Bookings Panel - Only visible on mobile */}
      <MobilePotentialBookingsPanel
        potentialBookings={potentialBookings}
        selectedBooking={selectedPotentialBooking}
        onSelectBooking={handlePotentialBookingSelect}
        onClearSelection={clearPotentialSelection}
        onBookingUpdate={handleBookingUpdate}
        onEditBooking={handleEditBooking}
        cameras={cameras}
        isDarkMode={isDarkMode}
        isOpen={showPotentialSidebar}
        onClose={() => {
          setShowPotentialSidebar(false);
          clearPotentialSelection();
        }}
      />

      {/* Modals */}
      <CreateBookingModal
        open={createBookingModal.open}
        onClose={() => setCreateBookingModal({ open: false, camera: null, dateRange: null })}
        cameras={cameras}
        preselectedCamera={createBookingModal.camera}
        preselectedDateRange={createBookingModal.dateRange}
        onSuccess={handleBookingUpdate}
        isDarkMode={isDarkMode}
      />

      <BookingDetailsModal
        open={bookingDetailsModal.open}
        onClose={() => setBookingDetailsModal({ open: false, booking: null, camera: null })}
        booking={bookingDetailsModal.booking}
        camera={bookingDetailsModal.camera}
        onBookingUpdate={handleBookingUpdate}
        isDarkMode={isDarkMode}
      />

      <EditPotentialBookingModal
        open={!!editingBooking}
        onClose={() => setEditingBooking(null)}
        booking={editingBooking}
        cameras={cameras || []}
        onSuccess={handleEditSuccess}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default Bookings;
