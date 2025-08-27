import React, { useState } from 'react';
import { CheckCircle, Edit, Trash2, AlertTriangle, Camera, Calendar, DollarSign } from 'lucide-react';
import { convertPotentialToConfirmed, updatePotentialBooking, checkBookingConflicts, deletePotentialBooking } from '../../services/bookingService';

const PotentialBookingCard = ({
  booking,
  isSelected,
  onSelect,
  onUpdate,
  onEdit,
  isDarkMode
}) => {
  const [loading, setLoading] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [conflictChecked, setConflictChecked] = useState(false);

  // Check for conflicts when card is rendered
  React.useEffect(() => {
    if (!conflictChecked) {
      checkConflicts();
    }
  }, [booking.id, conflictChecked]);

  const checkConflicts = async () => {
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
  };

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
  const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

  // Calculate days
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // Theme classes
  const cardBg = isDarkMode ? 'bg-gray-700' : 'bg-white';
  const cardBorder = isDarkMode ? 'border-gray-600' : 'border-slate-200';
  const selectedBorder = isDarkMode ? 'border-orange-500' : 'border-orange-400';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-300' : 'text-slate-600';
  const mutedTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-500';
  
  const conflictBg = isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200';
  const conflictIcon = isDarkMode ? 'text-red-400' : 'text-red-600';
  
  const buttonBg = isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-100 hover:bg-gray-200';
  const buttonText = isDarkMode ? 'text-gray-200' : 'text-gray-700';
  
  const confirmBg = isDarkMode ? 'bg-green-800 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700';
  const deleteBg = isDarkMode ? 'bg-red-800 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700';

  return (
    <div 
      className={`border rounded-lg p-3 cursor-pointer transition ${cardBg} ${
        isSelected ? selectedBorder : cardBorder
      } ${hasConflicts ? conflictBg : ''} ${
        isSelected ? 'ring-2 ring-orange-400/20' : ''
      }`}
      onClick={onSelect}
    >
      {/* Header with customer name and conflict indicator */}
      <div className="flex items-center justify-between mb-2">
        <h4 className={`font-medium ${textColor}`}>{booking.customer_name}</h4>
        {hasConflicts && (
          <AlertTriangle className={`w-4 h-4 ${conflictIcon}`} title="Booking conflicts with confirmed booking" />
        )}
      </div>

      {/* Camera info */}
      <div className="flex items-center gap-2 mb-2">
        <Camera className={`w-4 h-4 ${mutedTextColor}`} />
        <span className={`text-sm ${secondaryTextColor}`}>
          {booking.cameras?.name || 'Camera'}
        </span>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2 mb-2">
        <Calendar className={`w-4 h-4 ${mutedTextColor}`} />
        <span className={`text-sm ${secondaryTextColor}`}>
          {dateRange} ({days} day{days !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Pricing */}
      {booking.total_price && (
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className={`w-4 h-4 ${mutedTextColor}`} />
          <span className={`text-sm ${secondaryTextColor}`}>
            ₱{booking.total_price.toFixed(2)}
            {booking.price_per_day && (
              <span className={`text-xs ${mutedTextColor} ml-1`}>
                (₱{booking.price_per_day}/day)
              </span>
            )}
          </span>
        </div>
      )}

      {/* Contact info */}
      <div className={`text-xs ${mutedTextColor} mb-3`}>
        {booking.customer_contact}
        {booking.customer_email && (
          <span className="block">{booking.customer_email}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleConvertToConfirmed();
          }}
          disabled={loading || hasConflicts}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded transition ${
            hasConflicts 
              ? (isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
              : `${confirmBg} text-white`
          }`}
          title={hasConflicts ? 'Cannot confirm due to conflicts' : 'Convert to confirmed booking'}
        >
          <CheckCircle className="w-3 h-3" />
          {loading ? 'Converting...' : 'Confirm'}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(booking);
          }}
          disabled={loading}
          className={`px-3 py-1.5 text-xs rounded transition ${buttonBg} ${buttonText}`}
          title="Edit booking details"
        >
          <Edit className="w-3 h-3" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={loading}
          className={`px-3 py-1.5 text-xs rounded transition ${deleteBg} text-white`}
          title="Delete booking"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Conflict warning */}
      {hasConflicts && (
        <div className={`mt-2 p-2 rounded text-xs ${isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'}`}>
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          Conflicts with confirmed booking
        </div>
      )}
    </div>
  );
};

export default PotentialBookingCard;
