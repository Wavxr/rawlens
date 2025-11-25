import { useEffect, useMemo, useState, useCallback, Suspense, lazy } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Plus, Menu, Clock } from 'lucide-react';
import { getAllCameras } from '@services/cameraService';
import { getCalendarBookings, getPotentialBookings } from '@services/bookingService';
import useExtensionStore from '@stores/extensionStore';
import useIsMobile from '@hooks/useIsMobile';

const BookingCalendarGrid = lazy(() => import('@components/admin/bookings/BookingCalendarGrid'));
const PotentialBookingsSidebar = lazy(() => import('@components/admin/bookings/PotentialBookingsSidebar'));
const MobilePotentialBookingsPanel = lazy(() => import('@components/admin/bookings/MobilePotentialBookingsPanel'));
const ExtensionRequestSidebar = lazy(() => import('@components/admin/bookings/ExtensionRequestSidebar'));
const MobileExtensionRequestSidebar = lazy(() => import('@components/admin/bookings/MobileExtensionRequestSidebar'));
const CreateBookingModal = lazy(() => import('@components/admin/bookings/CreateBookingModal'));
const BookingDetailsModal = lazy(() => import('@components/admin/bookings/BookingDetailsModal'));
const EditPotentialBookingModal = lazy(() => import('@components/admin/bookings/EditPotentialBookingModal'));
const ExtendBookingModal = lazy(() => import('@components/admin/bookings/ExtendBookingModal'));
const BookingContextMenu = lazy(() => import('@components/admin/bookings/BookingContextMenu'));

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
  const [potentialBookings, setPotentialBookings] = useState([]);
  const [bookingsByCamera, setBookingsByCamera] = useState({});
  
  // Extension store
  const { getPendingExtensions } = useExtensionStore();

  // UI state
  const [activePanel, setActivePanel] = useState(null);
  const [selectedPotentialBooking, setSelectedPotentialBooking] = useState(null);
  const [highlightedDates, setHighlightedDates] = useState([]);
  const isDarkMode = true;
  const isMobile = useIsMobile();
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
  const [extendBookingModal, setExtendBookingModal] = useState({
    open: false,
    booking: null
  });
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    open: false,
    position: { x: 0, y: 0 },
    booking: null
  });

  // Calculate date range for current month
  const monthStartIso = useMemo(() => formatISODate(startOfMonth(monthDate)), [monthDate]);
  const monthEndIso = useMemo(() => formatISODate(endOfMonth(monthDate)), [monthDate]);

  const loadBookingData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const [cameraRes, calendarRes, potentialRes] = await Promise.all([
        getAllCameras(),
        getCalendarBookings(monthStartIso, monthEndIso),
        getPotentialBookings()
      ]);

      // Handle cameras - sort by name to group similar cameras together
      if (cameraRes.error) throw new Error(cameraRes.error);
      const sortedCameras = (cameraRes.data || []).sort((a, b) => {
        // Primary sort: by camera name (alphabetical)
        const nameComparison = a.name.localeCompare(b.name);
        if (nameComparison !== 0) return nameComparison;
        
        // Secondary sort: by serial number (if same name)
        if (a.serial_number && b.serial_number) {
          return a.serial_number.localeCompare(b.serial_number);
        }
        
        // If one has serial number and other doesn't, prioritize the one with serial number
        if (a.serial_number && !b.serial_number) return -1;
        if (!a.serial_number && b.serial_number) return 1;
        
        // Fallback: by creation date (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setCameras(sortedCameras);

      // Handle calendar bookings
      if (!calendarRes.success) throw new Error(calendarRes.error);
      const confirmedBookings = calendarRes.data || [];
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
  }, [monthStartIso, monthEndIso]);

  // Load data when month changes
  useEffect(() => {
    loadBookingData();
  }, [monthStartIso, monthEndIso, loadBookingData]);

  // Handle date range selection for booking creation
  const handleDateRangeSelect = (camera, startDate, endDate) => {
    setCreateBookingModal({
      open: true,
      camera,
      dateRange: { startDate, endDate }
    });
    // Close mobile panel when date is selected
    if (isMobile && activePanel === 'potential') {
      setActivePanel(null);
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
    // Close sidebars when calendar is interacted with
    if (isMobile && activePanel) {
      if (activePanel === 'potential') {
        clearPotentialSelection();
      }
      setActivePanel(null);
    }
  };

  // Handle right-click context menu
  const handleBookingContextMenu = (e, booking) => {
    e.preventDefault();
    setContextMenu({
      open: true,
      position: { x: e.clientX, y: e.clientY },
      booking
    });
  };

  // Close context menu
  const handleCloseContextMenu = () => {
    setContextMenu({ open: false, position: { x: 0, y: 0 }, booking: null });
  };

  // Context menu actions
  const handleContextViewDetails = (booking) => {
    const camera = cameras.find(c => c.id === booking.camera_id);
    setBookingDetailsModal({
      open: true,
      booking,
      camera
    });
  };

  const handleContextExtendRental = (booking) => {
    setExtendBookingModal({
      open: true,
      booking
    });
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

  const isPotentialPanelActive = activePanel === 'potential';
  const isExtensionPanelActive = activePanel === 'extension';

  const togglePotentialPanel = () => {
    setActivePanel((prev) => {
      if (prev === 'potential') {
        clearPotentialSelection();
        return null;
      }
      return 'potential';
    });
  };

  const toggleExtensionPanel = () => {
    setActivePanel((prev) => {
      if (prev === 'extension') {
        return null;
      }
      if (prev === 'potential') {
        clearPotentialSelection();
      }
      return 'extension';
    });
  };

  // Handle successful booking creation/update
  const handleBookingUpdate = () => {
    loadBookingData(); // Refresh data
    setCreateBookingModal({ open: false, camera: null, dateRange: null });
    setBookingDetailsModal({ open: false, booking: null, camera: null });
    setExtendBookingModal({ open: false, booking: null });
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
  const navigationButtonClass = 'p-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 transition';
  const createButtonClass = 'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 transition text-sm sm:text-base';
  const controlButtonBase = 'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border transition text-sm sm:text-base';
  const controlButtonInactive = `${controlButtonBase} border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700`;
  const potentialButtonActive = `${controlButtonBase} border-blue-700 bg-blue-900 text-blue-200`;
  const extensionButtonActive = `${controlButtonBase} border-purple-700 bg-purple-900 text-purple-200`;
  const desktopLayoutClass = activePanel
    ? 'lg:grid-cols-[minmax(0,3.5fr)_minmax(0,1.5fr)]'
    : 'lg:grid-cols-[minmax(0,1fr)]';

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Top row - Month Navigation and Create Button */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              className={navigationButtonClass}
              onClick={() => setMonthDate(prev => addMonths(prev, -1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-lg sm:text-xl font-semibold text-gray-100 min-w-0 text-center">
              {monthLabel}
            </div>
            <button
              className={navigationButtonClass}
              onClick={() => setMonthDate(prev => addMonths(prev, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Create Booking Button - Mobile optimized */}
          <button
            className={createButtonClass}
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
            className={isPotentialPanelActive ? potentialButtonActive : controlButtonInactive}
            onClick={togglePotentialPanel}
          >
            <Menu className="w-4 h-4" />
            <span className="hidden xs:inline">Potential</span>
            <span className="hidden sm:inline">Bookings</span>
            {potentialBookings.length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                isPotentialPanelActive ? 'bg-blue-800 text-blue-200' : 'bg-blue-800/70 text-blue-200'
              }`}>
                {potentialBookings.length}
              </span>
            )}
          </button>

          {/* Extension Requests Toggle */}
          <button
            className={isExtensionPanelActive ? extensionButtonActive : controlButtonInactive}
            onClick={toggleExtensionPanel}
          >
            <Clock className="w-4 h-4" />
            <span className="hidden xs:inline">Extension</span>
            <span className="hidden sm:inline">Requests</span>
            {getPendingExtensions().length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                isExtensionPanelActive ? 'bg-purple-800 text-purple-200' : 'bg-purple-800/70 text-purple-200'
              }`}>
                {getPendingExtensions().length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-lg border border-rose-800 bg-rose-900/30 text-rose-200">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className={`grid grid-cols-1 gap-6 ${desktopLayoutClass}`}>
        {/* Calendar Grid */}
        <div className="min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading calendars...
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-20 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading calendars...
                </div>
              }
            >
              <BookingCalendarGrid
                cameras={cameras}
                monthDate={monthDate}
                bookingsByCamera={bookingsByCamera}
                highlightedDates={highlightedDates}
                selectedPotentialBooking={selectedPotentialBooking}
                onDateRangeSelect={handleDateRangeSelect}
                onDayClick={handleDayClick}
                onBookingContextMenu={handleBookingContextMenu}
                isDarkMode={isDarkMode}
                isPanelOpen={Boolean(activePanel)}
              />
            </Suspense>
          )}
        </div>

        {/* Desktop Potential Bookings Sidebar - Hidden on mobile */}
        {isPotentialPanelActive && (
          <div className="hidden lg:block min-w-0">
            <div className="lg:sticky lg:top-6">
              <Suspense fallback={null}>
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
              </Suspense>
            </div>
          </div>
        )}

        {/* Desktop Extension Requests Sidebar - Hidden on mobile */}
        {isExtensionPanelActive && (
          <div className="hidden lg:block min-w-0">
            <div className="lg:sticky lg:top-6">
              <Suspense fallback={null}>
                <ExtensionRequestSidebar
                  isOpen={isExtensionPanelActive}
                  onClose={() => setActivePanel(null)}
                  isDarkMode={isDarkMode}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Potential Bookings Panel - Only visible on mobile */}
      <Suspense fallback={null}>
        <MobilePotentialBookingsPanel
          potentialBookings={potentialBookings}
          selectedBooking={selectedPotentialBooking}
          onSelectBooking={handlePotentialBookingSelect}
          onClearSelection={clearPotentialSelection}
          onBookingUpdate={handleBookingUpdate}
          onEditBooking={handleEditBooking}
          cameras={cameras}
          isDarkMode={isDarkMode}
          isOpen={isPotentialPanelActive}
          onClose={() => {
            if (activePanel === 'potential') {
              clearPotentialSelection();
            }
            setActivePanel(null);
          }}
        />
      </Suspense>

      {/* Mobile Extension Requests Panel - Only visible on mobile */}
      <Suspense fallback={null}>
        <MobileExtensionRequestSidebar
          isOpen={isExtensionPanelActive}
          onClose={() => setActivePanel(null)}
          isDarkMode={isDarkMode}
        />
      </Suspense>

      {/* Modals */}
      <Suspense fallback={null}>
        <CreateBookingModal
          open={createBookingModal.open}
          onClose={() => setCreateBookingModal({ open: false, camera: null, dateRange: null })}
          cameras={cameras}
          preselectedCamera={createBookingModal.camera}
          preselectedDateRange={createBookingModal.dateRange}
          onSuccess={handleBookingUpdate}
          isDarkMode={isDarkMode}
        />
      </Suspense>

      <Suspense fallback={null}>
        <BookingDetailsModal
          open={bookingDetailsModal.open}
          onClose={() => setBookingDetailsModal({ open: false, booking: null, camera: null })}
          booking={bookingDetailsModal.booking}
          camera={bookingDetailsModal.camera}
          onBookingUpdate={handleBookingUpdate}
          onExtendRental={(booking) => setExtendBookingModal({ open: true, booking })}
          isDarkMode={isDarkMode}
        />
      </Suspense>

      <Suspense fallback={null}>
        <EditPotentialBookingModal
          open={!!editingBooking}
          onClose={() => setEditingBooking(null)}
          booking={editingBooking}
          cameras={cameras || []}
          onSuccess={handleEditSuccess}
          isDarkMode={isDarkMode}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ExtendBookingModal
          isOpen={extendBookingModal.open}
          onClose={() => setExtendBookingModal({ open: false, booking: null })}
          booking={extendBookingModal.booking}
        />
      </Suspense>

      {/* Context Menu */}
      <Suspense fallback={null}>
        <BookingContextMenu
          isOpen={contextMenu.open}
          position={contextMenu.position}
          booking={contextMenu.booking}
          onClose={handleCloseContextMenu}
          onViewDetails={handleContextViewDetails}
          onExtendRental={handleContextExtendRental}
        />
      </Suspense>
      </div>
    </div>
  );
};

export default Bookings;
