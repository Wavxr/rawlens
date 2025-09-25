import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, UserCheck, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import useExtensionStore from '../../stores/extensionStore';
import { adminGetAllExtensions, adminApproveExtension, adminRejectExtension } from '../../services/extensionService';
import { supabase } from '../../lib/supabaseClient';
import ExtensionRequestCard from './ExtensionRequestCard';

const ExtensionRequestSidebar = ({ isOpen, onClose }) => {
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
    } catch (error) {
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

  if (!isOpen) return null;

  const sidebarClasses = isMobile
    ? "fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto"
    : "w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden";

  return (
    <div className={sidebarClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Extension Requests
          </h2>
          {extensionCounts.pending > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
              {extensionCounts.pending}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All ({extensionCounts.total})</option>
              <option value="pending">Pending ({extensionCounts.pending})</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Requested By
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="user">Users ({extensionCounts.user})</option>
              <option value="admin">Admins ({extensionCounts.admin})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={loadExtensions}
                className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : filteredExtensions.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {extensions.length === 0 ? 'No extension requests yet' : 'No extensions match your filters'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Group extensions by role */}
            {filterRole === 'all' && (
              <>
                {/* Admin Requests */}
                {filteredExtensions.filter(e => e.requested_by_role === 'admin').length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Admin Requests
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {filteredExtensions
                        .filter(e => e.requested_by_role === 'admin')
                        .map((extension) => (
                          <ExtensionRequestCard
                            key={extension.id}
                            extension={extension}
                            onApprove={handleApproveExtension}
                            onReject={handleRejectExtension}
                            loading={actionLoading[extension.id]}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* User Requests */}
                {filteredExtensions.filter(e => e.requested_by_role === 'user').length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        User Requests
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {filteredExtensions
                        .filter(e => e.requested_by_role === 'user')
                        .map((extension) => (
                          <ExtensionRequestCard
                            key={extension.id}
                            extension={extension}
                            onApprove={handleApproveExtension}
                            onReject={handleRejectExtension}
                            loading={actionLoading[extension.id]}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Single role view */}
            {filterRole !== 'all' && (
              <div className="space-y-2">
                {filteredExtensions.map((extension) => (
                  <ExtensionRequestCard
                    key={extension.id}
                    extension={extension}
                    onApprove={handleApproveExtension}
                    onReject={handleRejectExtension}
                    loading={actionLoading[extension.id]}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtensionRequestSidebar;