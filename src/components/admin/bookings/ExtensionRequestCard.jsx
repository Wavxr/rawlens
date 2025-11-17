import React, { useState } from 'react';
import { Calendar, Camera, User, DollarSign, Clock, CheckCircle, XCircle, Eye, Image, UserCheck } from 'lucide-react';
import useAuthStore from '@stores/useAuthStore';

const ExtensionRequestCard = ({ extension, onApprove, onReject, loading, isDarkMode }) => {
  const { user } = useAuthStore();
  const [showDetails, setShowDetails] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { 
        color: isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800', 
        icon: Clock 
      },
      approved: { 
        color: isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800', 
        icon: CheckCircle 
      },
      rejected: { 
        color: isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800', 
        icon: XCircle 
      }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleApprove = () => {
    if (onApprove && user) {
      onApprove(extension.id, user.id);
    }
  };

  const handleReject = () => {
    if (onReject && user) {
      onReject(extension.id, user.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  const rental = extension.rentals;
  const customer = rental?.users;
  const camera = rental?.cameras;

  // Theme classes
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-300' : 'text-slate-600';
  const mutedTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-500';

  return (
    <>
      <div className={`rounded-lg border p-3 sm:p-4 ${cardBg} ${borderColor}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {extension.requested_by_role === 'admin' ? (
                <UserCheck className="w-4 h-4 text-purple-600" />
              ) : (
                <User className="w-4 h-4 text-blue-600" />
              )}
              <span className={`text-xs ${mutedTextColor}`}>
                {extension.requested_by_role === 'admin' ? 'Admin Request' : 'User Request'}
              </span>
            </div>
          </div>
          {getStatusBadge(extension.extension_status)}
        </div>

        {/* Customer & Camera Info */}
        <div className="space-y-2 mb-3">
          {customer && (
            <div className="flex items-center gap-2">
              <User className={`w-4 h-4 ${mutedTextColor}`} />
              <span className={`text-sm font-medium ${textColor}`}>
                {customer.first_name} {customer.last_name}
              </span>
            </div>
          )}
          
          {camera && (
            <div className="flex items-center gap-2">
              <Camera className={`w-4 h-4 ${mutedTextColor}`} />
              <span className={`text-sm ${secondaryTextColor}`}>
                {camera.name}
              </span>
            </div>
          )}
        </div>

        {/* Extension Details */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${mutedTextColor}`} />
            <span className={`text-sm ${secondaryTextColor}`}>
              {formatDate(extension.original_end_date)} → {formatDate(extension.requested_end_date)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className={`w-4 h-4 ${mutedTextColor}`} />
            <span className={`text-sm font-medium ${textColor}`}>
              +₱{extension.additional_price} ({extension.extension_days} day{extension.extension_days > 1 ? 's' : ''})
            </span>
          </div>
        </div>

        {/* Payment Proof Indicator */}
        {extension.requested_by_role === 'admin' && (
          <div className="flex items-center gap-2 mb-3">
            <Image className={`w-4 h-4 ${mutedTextColor}`} />
            <span className={`text-xs ${mutedTextColor}`}>
              Payment proof uploaded by admin
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition ${
              isDarkMode 
                ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Eye className="w-3 h-3" />
            {showDetails ? 'Hide' : 'Show'} Details
          </button>

          {extension.extension_status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                disabled={loading === 'approving'}
                className={`px-3 py-1 text-xs rounded transition text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading === 'approving' ? 'Approving...' : 'Approve'}
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={loading === 'rejecting'}
                className={`px-3 py-1 text-xs rounded transition text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading === 'rejecting' ? 'Rejecting...' : 'Reject'}
              </button>
            </>
          )}
        </div>

        {/* Extended Details */}
        {showDetails && (
          <div className={`mt-3 pt-3 border-t space-y-2 ${borderColor}`}>
            <div className={`text-xs ${mutedTextColor}`}>
              <strong>Requested:</strong> {formatDate(extension.requested_at)}
            </div>
            
            {extension.approved_at && (
              <div className={`text-xs ${mutedTextColor}`}>
                <strong>Approved:</strong> {formatDate(extension.approved_at)}
              </div>
            )}

            {extension.rejected_at && (
              <div className={`text-xs ${mutedTextColor}`}>
                <strong>Rejected:</strong> {formatDate(extension.rejected_at)}
              </div>
            )}

            {extension.admin_notes && (
              <div className={`text-xs ${mutedTextColor}`}>
                <strong>Notes:</strong> {extension.admin_notes}
              </div>
            )}

            {customer?.email && (
              <div className={`text-xs ${mutedTextColor}`}>
                <strong>Customer Email:</strong> {customer.email}
              </div>
            )}

            {customer?.contact_number && (
              <div className={`text-xs ${mutedTextColor}`}>
                <strong>Contact:</strong> {customer.contact_number}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${cardBg} ${borderColor} border`}>
            <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>
              Reject Extension Request
            </h3>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${secondaryTextColor}`}>
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                }`}
                rows="3"
                placeholder="Enter reason for rejection..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className={`px-4 py-2 text-sm rounded transition ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className={`px-4 py-2 text-sm rounded transition text-white ${
                  isDarkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Reject Extension
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExtensionRequestCard;