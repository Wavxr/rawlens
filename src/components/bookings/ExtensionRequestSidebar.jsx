import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, UserCheck, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import useExtensionStore from '../../stores/extensionStore';
import { adminGetAllExtensions, adminApproveExtension, adminRejectExtension } from '../../services/extensionService';
import { supabase } from '../../lib/supabaseClient';
import ExtensionRequestCard from './ExtensionRequestCard';

const ExtensionRequestSidebar = ({ isOpen, onClose, isDarkMode }) => {
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
    } catch {
      setError('Failed to load extension requests');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('extension-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_extensions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch the complete extension data with relations
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
    } catch {
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
    } catch {
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
  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const headerBg = isDarkMode ? 'bg-gray-900/50' : 'bg-slate-50';

  if (!isOpen) return null;

  const sidebarClasses = isMobile
    ? "fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto"
    : `h-full lg:h-auto lg:max-h-[calc(100vh-8rem)] flex flex-col border rounded-xl ${bgColor} ${borderColor}`;

  return (
    <div className={sidebarClasses}>
      {/* Header */}
      <div className={`p-3 sm:p-4 border-b ${borderColor} ${headerBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-semibold text-sm sm:text-base ${textColor} flex items-center gap-2`}>
              <Clock className="w-4 h-4 text-blue-600" />
              Extension Requests
            </h3>
            <p className={`text-xs sm:text-sm ${secondaryTextColor}`}>
              {filterStatus === 'all' 
                ? `${extensions.length} total requests`
                : `${filteredExtensions.length} of ${extensions.length} requests`
              }
              {extensionCounts.pending > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                }`}>
                  {extensionCounts.pending} pending
                </span>
              )}
            </p>
          </div>
          {isMobile && (
            <button
              onClick={onClose}
              className={`p-1 rounded hover:bg-gray-600/20 ${secondaryTextColor}`}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Options */}
        {extensions.length > 0 && (
          <div className="flex gap-1 sm:gap-2 mt-3">
            {[
              { 
                key: 'all', 
                label: 'All',
                count: extensionCounts.total
              },
              { 
                key: 'pending', 
                label: 'Pending',
                count: extensionCounts.pending
              },
              { 
                key: 'approved', 
                label: 'Approved',
                count: extensions.filter(e => e.extension_status === 'approved').length
              },
              { 
                key: 'rejected', 
                label: 'Rejected',
                count: extensions.filter(e => e.extension_status === 'rejected').length
              }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-2 sm:px-3 py-1 text-xs rounded transition ${
                  filterStatus === key
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

        {/* Role Filter - Secondary row */}
        {extensions.length > 0 && (
          <div className="flex gap-1 sm:gap-2 mt-2">
            {[
              { 
                key: 'all', 
                label: 'All Roles',
                count: extensionCounts.total
              },
              { 
                key: 'user', 
                label: 'Users',
                count: extensionCounts.user
              },
              { 
                key: 'admin', 
                label: 'Admins',
                count: extensionCounts.admin
              }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilterRole(key)}
                className={`px-2 sm:px-3 py-1 text-xs rounded transition ${
                  filterRole === key
                    ? (isDarkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800')
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
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className={`border rounded-lg p-3 ${
              isDarkMode ? 'bg-red-900/20 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p className="text-sm">{error}</p>
              <button
                onClick={loadExtensions}
                className={`mt-2 text-sm underline ${
                  isDarkMode ? 'text-red-400 hover:text-red-200' : 'text-red-600 hover:text-red-800'
                }`}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : extensions.length === 0 ? (
          <div className="p-4 sm:p-6 text-center">
            <Clock className={`w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 ${secondaryTextColor}`} />
            <p className={`text-sm sm:text-base ${secondaryTextColor}`}>No extension requests</p>
            <p className={`text-xs sm:text-sm mt-1 ${secondaryTextColor}`}>
              Extension requests will appear here
            </p>
          </div>
        ) : filteredExtensions.length === 0 ? (
          <div className="p-4 sm:p-6 text-center">
            <Clock className={`w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 ${secondaryTextColor}`} />
            <p className={`text-sm sm:text-base ${secondaryTextColor}`}>
              No requests match your filters
            </p>
            <p className={`text-xs sm:text-sm mt-1 ${secondaryTextColor}`}>
              Try changing the filter to see other requests
            </p>
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
            {filteredExtensions.map(extension => (
              <ExtensionRequestCard
                key={extension.id}
                extension={extension}
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
  );
};

export default ExtensionRequestSidebar;