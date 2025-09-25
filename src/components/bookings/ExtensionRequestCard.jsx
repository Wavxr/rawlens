import React, { useState } from 'react';
import { Calendar, Camera, User, DollarSign, Clock, CheckCircle, XCircle, Eye, Image, UserCheck } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';

const ExtensionRequestCard = ({ extension, onApprove, onReject, loading }) => {
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
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle }
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

  return (
    <>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {extension.requested_by_role === 'admin' ? (
                <UserCheck className="w-4 h-4 text-purple-600" />
              ) : (
                <User className="w-4 h-4 text-blue-600" />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
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
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-900 dark:text-white">
                {customer.first_name} {customer.last_name}
              </span>
            </div>
          )}
          
          {camera && (
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {camera.name}
              </span>
            </div>
          )}
        </div>

        {/* Extension Details */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {formatDate(extension.original_end_date)} → {formatDate(extension.requested_end_date)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              +₱{extension.additional_price} ({extension.extension_days} day{extension.extension_days > 1 ? 's' : ''})
            </span>
          </div>
        </div>

        {/* Payment Proof Indicator */}
        {extension.requested_by_role === 'admin' && (
          <div className="flex items-center gap-2 mb-3">
            <Image className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Payment proof uploaded by admin
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          >
            <Eye className="w-3 h-3" />
            {showDetails ? 'Hide' : 'Show'} Details
          </button>

          {extension.extension_status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                disabled={loading === 'approving'}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'approving' ? 'Approving...' : 'Approve'}
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={loading === 'rejecting'}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'rejecting' ? 'Rejecting...' : 'Reject'}
              </button>
            </>
          )}
        </div>

        {/* Extended Details */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <strong>Requested:</strong> {formatDate(extension.requested_at)}
            </div>
            
            {extension.approved_at && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <strong>Approved:</strong> {formatDate(extension.approved_at)}
              </div>
            )}

            {extension.rejected_at && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <strong>Rejected:</strong> {formatDate(extension.rejected_at)}
              </div>
            )}

            {extension.admin_notes && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <strong>Notes:</strong> {extension.admin_notes}
              </div>
            )}

            {customer?.email && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <strong>Customer Email:</strong> {customer.email}
              </div>
            )}

            {customer?.contact_number && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <strong>Contact:</strong> {customer.contact_number}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Reject Extension Request
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows="3"
                placeholder="Enter reason for rejection..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
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