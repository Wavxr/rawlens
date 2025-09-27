import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, UserCheck, Users, ChevronUp, ChevronDown, CheckCircle, XCircle, Eye, Filter, Calendar, Camera, User, DollarSign } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import useExtensionStore from '../../stores/extensionStore';
import { adminGetAllExtensions, adminApproveExtension, adminRejectExtension } from '../../services/extensionService';
import { supabase } from '../../lib/supabaseClient';
import useAuthStore from '../../stores/useAuthStore';

const MobileExtensionRequestCard = ({ extension, onApprove, onReject, loading, isSelected, onSelect, isDarkMode }) => {
  const { user } = useAuthStore();
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleApprove = async (e) => {
    e.stopPropagation();
    if (!user) return;
    
    setActionLoading(true);
    try {
      await onApprove(extension.id, user.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.stopPropagation();
    if (!user) return;
    
    setActionLoading(true);
    try {
      await onReject(extension.id, user.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return isDarkMode ? 'text-green-400' : 'text-green-600';
      case 'rejected': return isDarkMode ? 'text-red-400' : 'text-red-600';
      default: return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
    }
  };

  const rental = extension.rentals;
  const customer = rental?.users;
  const camera = rental?.cameras;

  // Theme classes
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-300' : 'text-slate-600';
  const mutedTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-500';
  
  const selectedBorder = isSelected ? (isDarkMode ? 'border-orange-400' : 'border-orange-400') : (isDarkMode ? 'border-gray-600' : 'border-slate-200');
  
  const approveBg = isDarkMode ? 'bg-green-800 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700';
  const rejectBg = isDarkMode ? 'bg-red-800 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700';
  const viewBg = isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-100 hover:bg-gray-200';
  const viewText = isDarkMode ? 'text-gray-200' : 'text-gray-700';

  return (
    <>
      <div 
        className={`border-2 rounded-lg p-2 cursor-pointer transition ${cardBg} ${selectedBorder} ${
          isSelected ? 'ring-2 ring-orange-400/20' : ''
        }`}
        onClick={onSelect}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              {extension.requested_by_role === 'admin' ? (
                <UserCheck className="w-3 h-3 text-purple-500" />
              ) : (
                <Users className="w-3 h-3 text-blue-500" />
              )}
              <span className={`text-[10px] ${mutedTextColor}`}>
                {extension.requested_by_role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
            {customer && (
              <h4 className={`font-medium text-xs truncate ${textColor}`}>
                {customer.first_name} {customer.last_name}
              </h4>
            )}
            {camera && (
              <p className={`text-[10px] truncate ${secondaryTextColor}`}>
                {camera.name}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 ml-2">
            <div className={`text-[10px] font-medium ${getStatusColor(extension.extension_status)}`}>
              {extension.extension_status.charAt(0).toUpperCase() + extension.extension_status.slice(1)}
            </div>
            <div className={`text-[10px] ${textColor}`}>
              +₱{extension.additional_price}
            </div>
          </div>
        </div>

        {/* Extension Details */}
        <div className={`text-[10px] ${mutedTextColor} mb-1.5`}>
          {formatDate(extension.original_end_date)} → {formatDate(extension.requested_end_date)}
          <span className="ml-1">({extension.extension_days}d)</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Toggle details or navigate to detail view
            }}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] rounded transition ${viewBg} ${viewText}`}
            title="View details"
          >
            <Eye className="w-2.5 h-2.5" />
            Details
          </button>

          {extension.extension_status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading || loading === 'approving'}
                className={`px-2 py-1 text-[10px] rounded transition ${approveBg} text-white`}
                title="Approve extension"
              >
                <CheckCircle className="w-2.5 h-2.5" />
              </button>

              <button
                onClick={() => {
                  setShowRejectModal(true);
                }}
                disabled={actionLoading || loading === 'rejecting'}
                className={`px-2 py-1 text-[10px] rounded transition ${rejectBg} text-white`}
                title="Reject extension"
              >
                <XCircle className="w-2.5 h-2.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={(e) => e.stopPropagation()}>
          <div className={`rounded-lg p-4 w-full max-w-sm ${cardBg}`}>
            <h3 className={`text-sm font-semibold mb-3 ${textColor}`}>
              Reject Extension Request
            </h3>
            
            <div className="mb-4">
              <label className={`block text-xs font-medium mb-2 ${secondaryTextColor}`}>
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className={`w-full px-2 py-1 text-xs border rounded ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                rows="2"
                placeholder="Enter reason..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className={`px-3 py-1 text-xs rounded transition ${viewBg} ${viewText}`}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className={`px-3 py-1 text-xs rounded transition ${rejectBg} text-white`}
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const MobileExtensionRequestSidebar = ({ isOpen, onClose, isDarkMode }) => {
  const isMobile = useIsMobile();
  const {
    extensions,
    loading,
    error,
    filterStatus,
    filterRole,
    setExtensions,
    setLoading,
    setError,
    setFilterStatus,
    setFilterRole,
    getFilteredExtensions,
    addOrUpdateExtension
  } = useExtensionStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Load extensions on mount
  useEffect(() => {
    if (isOpen) {
      loadExtensions();
      setupRealtimeSubscription();
    }
  }, [isOpen]);

  const loadExtensions = async () => {
    setLoading(true);
    try {
      const result = await adminGetAllExtensions();
      if (result.success) {
        setExtensions(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to load extension requests');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('mobile-extension-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_extensions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            fetchExtensionWithRelations(payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const fetchExtensionWithRelations = async (extensionId) => {
    try {
      const { data, error } = await supabase
        .from('rental_extensions')
        .select(`
          *,
          rentals (
            id, 
            start_date, 
            end_date, 
            camera_id, 
            cameras (name),
            users (id, first_name, last_name, email, contact_number)
          )
        `)
        .eq('id', extensionId)
        .single();

      if (!error && data) {
        addOrUpdateExtension(data);
      }
    } catch (error) {
      console.error('Failed to fetch extension with relations:', error);
    }
  };

  const handleApproveExtension = async (extensionId, adminId) => {
    setActionLoading(prev => ({ ...prev, [extensionId]: 'approving' }));
    try {
      const result = await adminApproveExtension(extensionId, adminId);
      if (result.success) {
        addOrUpdateExtension(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to approve extension');
    } finally {
      setActionLoading(prev => ({ ...prev, [extensionId]: null }));
    }
  };

  const handleRejectExtension = async (extensionId, adminId, reason) => {
    setActionLoading(prev => ({ ...prev, [extensionId]: 'rejecting' }));
    try {
      const result = await adminRejectExtension(extensionId, adminId, reason);
      if (result.success) {
        addOrUpdateExtension(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to reject extension');
    } finally {
      setActionLoading(prev => ({ ...prev, [extensionId]: null }));
    }
  };

  const filteredExtensions = useMemo(() => getFilteredExtensions(), [extensions, filterStatus, filterRole]);

  const extensionCounts = useMemo(() => {
    return {
      total: extensions.length,
      pending: extensions.filter(e => e.extension_status === 'pending').length,
      user: extensions.filter(e => e.requested_by_role === 'user').length,
      admin: extensions.filter(e => e.requested_by_role === 'admin').length
    };
  }, [extensions]);

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
                  <h3 className={`font-semibold text-xs ${textColor} flex items-center gap-1`}>
                    <Clock className="w-3 h-3" />
                    Extension Requests
                  </h3>
                  <p className={`text-[10px] ${secondaryTextColor}`}>
                    {filteredExtensions.length} request{filteredExtensions.length !== 1 ? 's' : ''}
                    {extensionCounts.pending > 0 && (
                      <span className="ml-1 px-1 py-0.5 bg-blue-500 text-white text-[8px] rounded">
                        {extensionCounts.pending} pending
                      </span>
                    )}
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
                { key: 'all', label: 'All', count: extensionCounts.total },
                { key: 'pending', label: 'Pending', count: extensionCounts.pending },
                { key: 'user', label: 'Users', count: extensionCounts.user },
                { key: 'admin', label: 'Admins', count: extensionCounts.admin }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'user' || key === 'admin') {
                      setFilterRole(key);
                    } else {
                      setFilterStatus(key);
                    }
                  }}
                  className={`px-1.5 py-0.5 text-[10px] rounded transition ${
                    (key === filterStatus || key === filterRole)
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
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="p-2">
                <div className={`p-2 rounded text-[10px] ${isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'}`}>
                  <p>{error}</p>
                  <button
                    onClick={loadExtensions}
                    className={`mt-1 text-[10px] underline ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : filteredExtensions.length === 0 ? (
              <div className="p-4 text-center">
                <Clock className={`w-6 h-6 mx-auto mb-2 ${secondaryTextColor}`} />
                <p className={`text-xs ${secondaryTextColor}`}>
                  {extensions.length === 0 ? 'No extension requests' : 'No requests match filters'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {filteredExtensions.map(extension => (
                  <MobileExtensionRequestCard
                    key={extension.id}
                    extension={extension}
                    isSelected={selectedExtension?.id === extension.id}
                    onSelect={() => setSelectedExtension(extension)}
                    onApprove={handleApproveExtension}
                    onReject={handleRejectExtension}
                    loading={actionLoading[extension.id]}
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

export default MobileExtensionRequestSidebar;