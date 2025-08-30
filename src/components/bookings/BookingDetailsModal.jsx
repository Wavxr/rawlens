import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle, Package, Calendar, User, Phone, Mail, DollarSign, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminConfirmReceived, adminConfirmReturned, adminMarkDelivered } from '../../services/bookingService';

const StatusBadge = ({ status, isDarkMode }) => {
  const getStatusStyles = () => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    
    if (isDarkMode) {
      switch(status) {
        case 'pending': return `${baseClasses} bg-amber-900/50 text-amber-200 border border-amber-700`;
        case 'confirmed': return `${baseClasses} bg-blue-900/50 text-blue-200 border border-blue-700`;
        case 'active': return `${baseClasses} bg-emerald-900/50 text-emerald-200 border border-emerald-700`;
        case 'completed': return `${baseClasses} bg-slate-700 text-slate-200 border border-slate-600`;
        case 'cancelled': return `${baseClasses} bg-red-900/50 text-red-200 border border-red-700`;
        default: return `${baseClasses} bg-slate-700 text-slate-300 border border-slate-600`;
      }
    } else {
      switch(status) {
        case 'pending': return `${baseClasses} bg-amber-100 text-amber-800 border border-amber-200`;
        case 'confirmed': return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
        case 'active': return `${baseClasses} bg-emerald-100 text-emerald-800 border border-emerald-200`;
        case 'completed': return `${baseClasses} bg-slate-100 text-slate-800 border border-slate-200`;
        case 'cancelled': return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
        default: return `${baseClasses} bg-slate-100 text-slate-700 border border-slate-200`;
      }
    }
  };

  return (
    <span className={getStatusStyles()}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const BookingDetailsModal = ({
  open,
  onClose,
  booking,
  camera,
  onBookingUpdate,
  isDarkMode
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!open || !booking) return null;

  const isTemporaryBooking = booking.booking_type === 'temporary';
  const customerName = booking.customer_name || 
                      (booking.users ? `${booking.users.first_name} ${booking.users.last_name}`.trim() : '') ||
                      'Unknown Customer';

  const handleAdminAction = async (action) => {
    setLoading(true);
    try {
      let result;
      
      switch(action) {
        case 'received':
          result = await adminConfirmReceived(booking.id);
          break;
        case 'returned':
          result = await adminConfirmReturned(booking.id);
          break;
        case 'delivered':
          result = await adminMarkDelivered(booking.id);
          break;
        default:
          throw new Error('Invalid action');
      }

      if (result.success) {
        onBookingUpdate();
      } else {
        alert(`Failed to ${action}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Failed to ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const navigateToRental = () => {
    const rentalId = booking?.id; // booking.id IS the rental ID
    console.log("BookingDetailsModal navigateToRental:", {
      booking: booking,
      rentalId: rentalId,
      bookingId: booking?.id,
      bookingKeys: booking ? Object.keys(booking) : null
    });
    if (rentalId) {
      const targetURL = `/admin/rentals?highlightId=${rentalId}`;
      console.log("Navigating to:", targetURL);
      navigate(targetURL);
    } else {
      console.log("No rental_id found, navigating to rentals without highlight");
      navigate("/admin/rentals");
    }
    onClose();
  };

  const navigateToDelivery = () => {
    const rentalId = booking?.id; // booking.id IS the rental ID
    console.log("BookingDetailsModal navigateToDelivery:", {
      booking: booking,
      rentalId: rentalId,
      bookingId: booking?.id
    });
    if (rentalId) {
      const targetURL = `/admin/delivery?rentalId=${rentalId}`;
      console.log("Navigating to delivery page:", targetURL);
      navigate(targetURL);
    } else {
      console.log("No rental_id found, navigating to delivery without highlight");
      navigate("/admin/delivery");
    }
    onClose();
  };

  // Format dates
  const startDate = new Date(booking.start_date).toLocaleDateString();
  const endDate = new Date(booking.end_date).toLocaleDateString();
  const createdDate = new Date(booking.created_at).toLocaleDateString();

  // Calculate rental duration
  const days = Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / (1000 * 60 * 60 * 24)) + 1;

  // Theme classes
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const sectionBg = isDarkMode ? 'bg-gray-800' : 'bg-slate-50';
  const adminActionsBg = isDarkMode ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      <div className={`relative rounded-lg shadow-xl w-full max-w-3xl mx-4 border ${bgColor} ${borderColor}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${borderColor}`}>
          <div>
            <h3 className={`text-lg font-semibold ${textColor}`}>Booking Details</h3>
            <p className={`text-sm ${secondaryTextColor}`}>
              {camera?.name || booking.cameras?.name}
              {(camera?.serial_number || booking.cameras?.serial_number) && (
                <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  #{camera?.serial_number || booking.cameras?.serial_number}
                </span>
              )}
              {' - '}{customerName}
            </p>
          </div>
          <button onClick={onClose} className={`text-gray-400 hover:text-gray-600`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Status Overview */}
          <div className={`p-4 rounded-lg ${sectionBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className={`font-medium ${textColor}`}>Status Overview</h4>
              <div className="flex gap-2">
                <StatusBadge status={booking.rental_status} isDarkMode={isDarkMode} />
                {booking.shipping_status && (
                  <StatusBadge status={booking.shipping_status} isDarkMode={isDarkMode} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className={`block ${secondaryTextColor}`}>Booking Type</span>
                <span className={textColor}>
                  {booking.booking_type === 'temporary' ? 'Admin Created' : 'User Registration'}
                </span>
              </div>
              <div>
                <span className={`block ${secondaryTextColor}`}>Created</span>
                <span className={textColor}>{createdDate}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className={`p-4 rounded-lg ${sectionBg}`}>
            <h4 className={`font-medium mb-4 ${textColor}`}>
              <User className="w-4 h-4 inline mr-2" />
              Customer Information
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className={`w-4 h-4 ${secondaryTextColor}`} />
                <span className={textColor}>{customerName}</span>
              </div>
              
              {booking.customer_contact && (
                <div className="flex items-center gap-2">
                  <Phone className={`w-4 h-4 ${secondaryTextColor}`} />
                  <span className={textColor}>{booking.customer_contact}</span>
                </div>
              )}
              
              {(booking.customer_email || booking.users?.email) && (
                <div className="flex items-center gap-2">
                  <Mail className={`w-4 h-4 ${secondaryTextColor}`} />
                  <span className={textColor}>
                    {booking.customer_email || booking.users?.email}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Booking Details */}
          <div className={`p-4 rounded-lg ${sectionBg}`}>
            <h4 className={`font-medium mb-4 ${textColor}`}>
              <Calendar className="w-4 h-4 inline mr-2" />
              Booking Details
            </h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className={`block ${secondaryTextColor}`}>Start Date</span>
                <span className={textColor}>{startDate}</span>
              </div>
              <div>
                <span className={`block ${secondaryTextColor}`}>End Date</span>
                <span className={textColor}>{endDate}</span>
              </div>
              <div>
                <span className={`block ${secondaryTextColor}`}>Duration</span>
                <span className={textColor}>{days} day{days !== 1 ? 's' : ''}</span>
              </div>
              <div>
                <span className={`block ${secondaryTextColor}`}>Booking ID</span>
                <span className={`text-xs font-mono ${textColor}`}>{booking.id}</span>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          {(booking.total_price || booking.price_per_day) && (
            <div className={`p-4 rounded-lg ${sectionBg}`}>
              <h4 className={`font-medium mb-4 ${textColor}`}>
                <DollarSign className="w-4 h-4 inline mr-2" />
                Pricing Information
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {booking.price_per_day && (
                  <div>
                    <span className={`block ${secondaryTextColor}`}>Rate per Day</span>
                    <span className={textColor}>₱{booking.price_per_day.toFixed(2)}</span>
                  </div>
                )}
                {booking.total_price && (
                  <div>
                    <span className={`block ${secondaryTextColor}`}>Total Amount</span>
                    <span className={`text-lg font-semibold ${textColor}`}>
                      ₱{booking.total_price.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contract Information */}
          {booking.contract_pdf_url && (
            <div className={`p-4 rounded-lg ${sectionBg}`}>
              <h4 className={`font-medium mb-4 ${textColor}`}>
                <FileText className="w-4 h-4 inline mr-2" />
                Contract
              </h4>
              
              <a
                href={booking.contract_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <FileText className="w-4 h-4" />
                View Contract PDF
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Admin Actions for Temporary Bookings */}
          {isTemporaryBooking && (
            <div className={`p-4 rounded-lg border ${adminActionsBg}`}>
              <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-orange-200' : 'text-orange-800'}`}>
                Admin Actions (Instagram Customer)
              </h4>
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                Since this is an admin-managed booking, you can perform customer actions on their behalf.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {booking.rental_status === 'confirmed' && (
                  <button
                    onClick={() => handleAdminAction('received')}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Customer Received Equipment
                  </button>
                )}
                
                {booking.rental_status === 'active' && (
                  <button
                    onClick={() => handleAdminAction('returned')}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Package className="w-4 h-4" />
                    Customer Returned Equipment
                  </button>
                )}
                
                {(booking.rental_status === 'confirmed' || booking.rental_status === 'active') && (
                  <button
                    onClick={() => handleAdminAction('delivered')}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Package className="w-4 h-4" />
                    Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Actions */}
          <div className="flex gap-3">
            <button
              onClick={navigateToRental}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Go to Rental Page
            </button>
            
            <button
              onClick={navigateToDelivery}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Package className="w-4 h-4" />
              Go to Delivery Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;
