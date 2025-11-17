import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, ChevronUp, ChevronDown, CheckCircle, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { checkBookingConflicts, convertPotentialToConfirmed, deletePotentialBooking } from '@services/bookingService';

const MobilePotentialBookingCard = ({ booking, isSelected, onSelect, onUpdate, onEdit, isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [conflictChecked, setConflictChecked] = useState(false);

  const checkConflicts = useCallback(async () => {
    try {
      const result = await checkBookingConflicts(
        booking.camera_id,
        booking.start_date,
        booking.end_date,
        booking.id
      );
      
      if (result.success) {
        setHasConflicts(result.data.hasConflicts);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setConflictChecked(true);
    }
  }, [booking.id, booking.camera_id, booking.start_date, booking.end_date]);

  // Check for conflicts when card is rendered
  useEffect(() => {
    if (!conflictChecked) {
      checkConflicts();
    }
  }, [conflictChecked, checkConflicts]);

  const handleConvertToConfirmed = async () => {
    setLoading(true);
    try {
      const result = await convertPotentialToConfirmed(booking.id);
      
      if (result.success) {
        onUpdate(); // Refresh data
      } else {
        alert(`Failed to confirm booking: ${result.error}`);
      }
    } catch (error) {
      console.error('Error converting to confirmed:', error);
      alert('Failed to confirm booking');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this potential booking?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await deletePotentialBooking(booking.id);
      
      if (result.success) {
        onUpdate(); // Refresh data
      } else {
        alert(`Failed to delete booking: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to delete booking');
    } finally {
      setLoading(false);
    }
  };

  // Format dates
  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // Theme classes
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-300' : 'text-slate-600';
  const mutedTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-500';
  
  const conflictBg = hasConflicts ? (isDarkMode ? 'border-red-500' : 'border-red-500') : '';
  const selectedBorder = isSelected ? (isDarkMode ? 'border-orange-400' : 'border-orange-400') : (isDarkMode ? 'border-gray-600' : 'border-slate-200');
  
  const confirmBg = isDarkMode ? 'bg-green-800 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700';
  const buttonBg = isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-100 hover:bg-gray-200';
  const buttonText = isDarkMode ? 'text-gray-200' : 'text-gray-700';
  const deleteBg = isDarkMode ? 'bg-red-800 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700';

  return (
    <div 
      className={`border-2 rounded-lg p-2 cursor-pointer transition ${cardBg} ${selectedBorder} ${conflictBg} ${
        isSelected ? 'ring-2 ring-orange-400/20' : ''
      }`}
      onClick={onSelect}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium text-xs truncate ${textColor}`}>{booking.customer_name}</h4>
          <p className={`text-[10px] truncate ${secondaryTextColor}`}>
            {booking.cameras?.name || 'Camera'}
            {booking.cameras?.serial_number && (
              <span className={`ml-1 ${mutedTextColor}`}>
                #{booking.cameras.serial_number}
              </span>
            )}
            {' • '}{days} day{days !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          {hasConflicts && (
            <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" title="Conflicts with confirmed booking" />
          )}
          <div className={`text-[10px] font-medium ${textColor}`}>
            {booking.total_price && `₱${booking.total_price.toFixed(0)}`}
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className={`text-[10px] ${mutedTextColor} mb-1.5`}>
        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleConvertToConfirmed();
          }}
          disabled={loading || hasConflicts}
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] rounded transition ${
            hasConflicts 
              ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
              : `${confirmBg} text-white`
          }`}
          title={hasConflicts ? 'Cannot confirm due to conflicts' : 'Convert to confirmed booking'}
        >
          <CheckCircle className="w-2.5 h-2.5" />
          {loading ? 'Converting...' : 'Confirm'}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(booking);
          }}
          disabled={loading}
          className={`px-2 py-1 text-[10px] rounded transition ${buttonBg} ${buttonText}`}
          title="Edit booking details"
        >
          <Edit className="w-2.5 h-2.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={loading}
          className={`px-2 py-1 text-[10px] rounded transition ${deleteBg} text-white`}
          title="Delete booking"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Conflict warning */}
      {hasConflicts && (
        <div className={`mt-1.5 p-1.5 rounded text-[9px] ${isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'}`}>
          <AlertTriangle className="w-2.5 h-2.5 inline mr-1" />
          Conflicts with confirmed booking
        </div>
      )}
    </div>
  );
};

const MobilePotentialBookingsPanel = ({
  potentialBookings,
  selectedBooking,
  onSelectBooking,
  onBookingUpdate,
  onEditBooking,
  isDarkMode,
  isOpen,
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState('all');
  const [conflictInfo, setConflictInfo] = useState({});

  // Check conflicts for all potential bookings
  useEffect(() => {
    const checkAllConflicts = async () => {
      const newConflictInfo = {};
      
      for (const booking of potentialBookings) {
        try {
          const result = await checkBookingConflicts(
            booking.camera_id,
            booking.start_date,
            booking.end_date,
            booking.id
          );
          
          if (result.success) {
            newConflictInfo[booking.id] = result.data.hasConflicts;
          } else {
            newConflictInfo[booking.id] = false;
          }
        } catch (error) {
          console.error(`Error checking conflicts for booking ${booking.id}:`, error);
          newConflictInfo[booking.id] = false;
        }
      }
      
      setConflictInfo(newConflictInfo);
    };

    if (potentialBookings.length > 0) {
      checkAllConflicts();
    }
  }, [potentialBookings]);

  // Filter bookings based on selected filter
  const filteredBookings = potentialBookings.filter(booking => {
    if (filter === 'all') return true;
    
    const hasConflicts = conflictInfo[booking.id] === true;
    
    if (filter === 'conflicts') return hasConflicts;
    if (filter === 'no-conflicts') return !hasConflicts;
    
    return true;
  });

  // Theme classes
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-600';

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Panel - Floating with margins */}
      <div className={`fixed bottom-4 left-4 right-4 z-50 lg:hidden transform transition-all duration-300 ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}>
        <div className={`border-2 rounded-xl shadow-2xl backdrop-blur-sm ${bgColor}/95 ${borderColor} ${
          isExpanded ? 'max-h-[60vh]' : 'max-h-[30vh]'
        } flex flex-col overflow-hidden`}>
          {/* Header with drag handle */}
          <div className={`p-2 border-b ${borderColor} flex-shrink-0`}>
            {/* Drag handle indicator */}
            <div className="flex justify-center mb-1">
              <div className={`w-8 h-1 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`p-1 rounded ${secondaryTextColor}`}
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
                <div>
                  <h3 className={`font-semibold text-xs ${textColor}`}>Potential Bookings</h3>
                  <p className={`text-[10px] ${secondaryTextColor}`}>
                    {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-1 rounded hover:bg-gray-600/20 ${secondaryTextColor}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex gap-1 mt-1">
              {[
                { key: 'all', label: 'All', count: potentialBookings.length },
                { key: 'conflicts', label: 'Conflicts', count: Object.values(conflictInfo).filter(hasConflict => hasConflict === true).length },
                { key: 'no-conflicts', label: 'Available', count: Object.values(conflictInfo).filter(hasConflict => hasConflict === false).length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-1.5 py-0.5 text-[10px] rounded transition ${
                    filter === key
                      ? (isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800')
                      : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {filteredBookings.length === 0 ? (
              <div className="p-4 text-center">
                <Calendar className={`w-6 h-6 mx-auto mb-2 ${secondaryTextColor}`} />
                <p className={`text-xs ${secondaryTextColor}`}>No potential bookings</p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {filteredBookings.map(booking => (
                  <MobilePotentialBookingCard
                    key={booking.id}
                    booking={booking}
                    isSelected={selectedBooking?.id === booking.id}
                    onSelect={() => onSelectBooking(booking)}
                    onUpdate={onBookingUpdate}
                    onEdit={onEditBooking}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MobilePotentialBookingsPanel;
