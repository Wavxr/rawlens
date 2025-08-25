import React, { useState, useEffect } from 'react';
import { X, Bell, AlertCircle } from 'lucide-react';

export const NotificationToast = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 6000); // Auto dismiss after 6 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300); // Wait for animation
  };

  const handleClick = () => {
    if (notification.data?.click_action) {
      window.location.href = notification.data.click_action;
    }
    handleDismiss();
  };

  if (!isVisible) return null;

  const isAdmin = notification.data?.type === 'admin';

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{ maxWidth: '380px' }}
    >
      <div
        className={`
          rounded-lg shadow-lg p-4 cursor-pointer
          ${isAdmin 
            ? 'bg-red-50 border border-red-200 text-red-900' 
            : 'bg-blue-50 border border-blue-200 text-blue-900'
          }
        `}
        onClick={handleClick}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            ${isAdmin ? 'bg-red-100' : 'bg-blue-100'}
          `}>
            {isAdmin ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Bell className="w-5 h-5 text-blue-600" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold mb-1 truncate">
              {notification.data?.title || 'RawLens'}
            </h4>
            <p className="text-sm opacity-90 line-clamp-2">
              {notification.data?.body || 'You have a new notification'}
            </p>
            {isAdmin && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                Admin
              </span>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
          <div 
            className={`h-1 rounded-full ${isAdmin ? 'bg-red-400' : 'bg-blue-400'}`}
            style={{
              animation: 'progress 6s linear forwards'
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default NotificationToast;