import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Phone, Mail } from 'lucide-react';
import PotentialBookingCard from './PotentialBookingCard';
import { checkBookingConflicts } from '../../services/bookingService';

const PotentialBookingsSidebar = ({
  potentialBookings,
  selectedBooking,
  onSelectBooking,
  onClearSelection,
  onBookingUpdate,
  onEditBooking,
  cameras,
  isDarkMode
}) => {
  const [filter, setFilter] = useState('all'); // 'all', 'conflicts', 'no-conflicts'
  const [conflictInfo, setConflictInfo] = useState({}); // Store conflict info for each booking

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
            // Debug logging
            console.log(`Booking ${booking.id} conflict check:`, {
              booking: booking.customer_name,
              dates: `${booking.start_date} to ${booking.end_date}`,
              hasConflicts: result.data.hasConflicts,
              conflictingBookings: result.data.conflictingBookings
            });
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

  // Use the passed edit handler instead of local state
  const handleEditBooking = onEditBooking;

  // Theme classes
  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const headerBg = isDarkMode ? 'bg-gray-900/50' : 'bg-slate-50';

  return (
    <div className={`h-full lg:h-auto lg:max-h-[calc(100vh-8rem)] flex flex-col border rounded-xl ${bgColor} ${borderColor}`}>
      {/* Header */}
      <div className={`p-3 sm:p-4 border-b ${borderColor} ${headerBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-semibold text-sm sm:text-base ${textColor}`}>Potential Bookings</h3>
            <p className={`text-xs sm:text-sm ${secondaryTextColor}`}>
              {filter === 'all' 
                ? `${potentialBookings.length} pending bookings`
                : `${filteredBookings.length} of ${potentialBookings.length} bookings`
              }
            </p>
          </div>
          {selectedBooking && (
            <button
              onClick={onClearSelection}
              className={`p-1 rounded hover:bg-gray-600/20 ${secondaryTextColor}`}
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Options */}
        {potentialBookings.length > 0 && (
          <div className="flex gap-1 sm:gap-2 mt-3">
            {[
              { 
                key: 'all', 
                label: 'All',
                count: potentialBookings.length
              },
              { 
                key: 'conflicts', 
                label: 'Conflicts',
                count: Object.values(conflictInfo).filter(hasConflict => hasConflict === true).length
              },
              { 
                key: 'no-conflicts', 
                label: 'Available',
                count: Object.values(conflictInfo).filter(hasConflict => hasConflict === false).length
              }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-2 sm:px-3 py-1 text-xs rounded transition ${
                  filter === key
                    ? (isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800')
                    : (isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                }`}
              >
                <span className="hidden sm:inline">{label} </span>
                <span className="sm:hidden">{label.charAt(0)}</span>
                ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {potentialBookings.length === 0 ? (
          <div className="p-4 sm:p-6 text-center">
            <Calendar className={`w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 ${secondaryTextColor}`} />
            <p className={`text-sm sm:text-base ${secondaryTextColor}`}>No potential bookings</p>
            <p className={`text-xs sm:text-sm mt-1 ${secondaryTextColor}`}>
              Create a new booking to get started
            </p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-4 sm:p-6 text-center">
            <Calendar className={`w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 ${secondaryTextColor}`} />
            <p className={`text-sm sm:text-base ${secondaryTextColor}`}>
              No bookings in "{filter === 'conflicts' ? 'Conflicts' : filter === 'no-conflicts' ? 'Available' : 'All'}" filter
            </p>
            <p className={`text-xs sm:text-sm mt-1 ${secondaryTextColor}`}>
              Try changing the filter to see other bookings
            </p>
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
            {filteredBookings.map(booking => (
              <PotentialBookingCard
                key={booking.id}
                booking={booking}
                isSelected={selectedBooking?.id === booking.id}
                onSelect={() => onSelectBooking(booking)}
                onUpdate={onBookingUpdate}
                onEdit={handleEditBooking}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
      </div>

      
    </div>
  );
};

export default PotentialBookingsSidebar;
