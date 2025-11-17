import React, { useEffect, useRef } from 'react';
import { Eye, Edit, Clock, X, Truck } from 'lucide-react';

const BookingContextMenu = ({ 
  isOpen, 
  position, 
  booking, 
  onClose, 
  onViewDetails,
  onEditBooking,
  onExtendRental,
  onCancelBooking,
  onMarkDelivered
}) => {
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !booking) return null;

  // Check if extend rental is available
  const canExtend = booking.rental_status === 'active' && booking.shipping_status === 'delivered';

  // Check if cancel is available
  const canCancel = ['confirmed', 'active'].includes(booking.rental_status);

  // Check if mark as delivered/returned is available
  const canMarkDelivered = booking.shipping_status === 'in_transit';
  const canMarkReturned = booking.shipping_status === 'delivered' && booking.rental_status === 'active';

  const menuItems = [
    {
      id: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: onViewDetails,
      available: true
    },
    {
      id: 'edit',
      label: 'Edit Booking',
      icon: Edit,
      onClick: onEditBooking,
      available: true
    },
    {
      id: 'extend',
      label: 'Extend Rental',
      icon: Clock,
      onClick: onExtendRental,
      available: canExtend,
      tooltip: !canExtend ? 'Only active rentals with delivered cameras can be extended' : null
    },
    {
      id: 'cancel',
      label: 'Cancel Booking',
      icon: X,
      onClick: onCancelBooking,
      available: canCancel,
      tooltip: !canCancel ? 'Only confirmed or active bookings can be cancelled' : null
    },
    {
      id: 'delivered',
      label: 'Mark as Delivered',
      icon: Truck,
      onClick: onMarkDelivered,
      available: canMarkDelivered,
      tooltip: !canMarkDelivered ? 'Only in-transit shipments can be marked as delivered' : null
    },
    {
      id: 'returned',
      label: 'Mark as Returned',
      icon: Truck,
      onClick: onMarkDelivered,
      available: canMarkReturned,
      tooltip: !canMarkReturned ? 'Only delivered active rentals can be marked as returned' : null
    }
  ];

  const availableItems = menuItems.filter(item => item.available);

  // Calculate menu position to prevent overflow
  const getMenuStyle = () => {
    const menuWidth = 200;
    const menuHeight = availableItems.length * 40 + 16; // Approximate height
    
    let { x, y } = position;

    // Adjust for right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    // Adjust for bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    return {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: 1000
    };
  };

  return (
    <div
      ref={menuRef}
      style={getMenuStyle()}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[200px]"
    >
      {availableItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            item.onClick(booking);
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={item.tooltip}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </button>
      ))}

      {/* Separator and unavailable items with tooltips */}
      {menuItems.some(item => !item.available) && (
        <>
          <hr className="my-2 border-gray-200 dark:border-gray-600" />
          {menuItems
            .filter(item => !item.available)
            .map((item) => (
              <div
                key={`disabled-${item.id}`}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed"
                title={item.tooltip}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            ))}
        </>
      )}
    </div>
  );
};

export default BookingContextMenu;