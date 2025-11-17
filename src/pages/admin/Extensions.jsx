import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  PhilippinePeso,
  Loader2,
  Search,
  MessageSquare
} from 'lucide-react';
import {
  adminGetAllExtensions,
  adminApproveExtension,
  adminRejectExtension,
  checkCameraAvailabilityForExtension,
} from '@services/extensionService';
import { subscribeToAllExtensions, unsubscribeFromChannel } from '@services/realtimeService';
import useAuthStore from '@stores/useAuthStore';
import useExtensionStore from '@stores/extensionStore';
import { toast } from 'react-toastify';

const Extensions = () => {
  const user = useAuthStore(state => state.user);
  // Use the extension store similar to payments
  const { extensions, setExtensions, getExtensionsByStatus } = useExtensionStore();
  const [loading, setLoading] = useState(true);
  const [storeReady, setStoreReady] = useState(false);
  const [processingExtension, setProcessingExtension] = useState({});
  const [checkingConflicts, setCheckingConflicts] = useState({});
  const [conflicts, setConflicts] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedExtension, setSelectedExtension] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const extensionSubscriptionRef = useRef(null);
  const checkedConflictsRef = useRef(new Set()); // Track which extensions have been checked

  // Get filtered extensions from store (similar to payments)
  const allExtensions = storeReady ? extensions : [];
  const pendingExtensions = useMemo(() => 
    storeReady ? getExtensionsByStatus('pending') : [], 
    [storeReady, getExtensionsByStatus]
  );

  useEffect(() => {
    const loadExtensions = async () => {
      try {
        // Load ALL extensions (not just pending) to populate the store properly
        const result = await adminGetAllExtensions();
        if (result.success) {
          setExtensions(result.data);
          setStoreReady(true);
        } else {
          console.error('API Error:', result.error);
        }
      } catch (error) {
        console.error('Error loading extensions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadExtensions();
    
    // Subscribe to real-time updates - the store will be updated by the realtime service
    const channel = subscribeToAllExtensions((payload) => {
      // The real-time service handles updating the store with hydrated data
      console.log('Extension update received:', payload.eventType, payload.hydratedData?.id);
    });

    extensionSubscriptionRef.current = channel;
    // Capture the ref value to avoid stale closure in cleanup
    const currentCheckedConflictsRef = checkedConflictsRef.current;

    return () => {
      if (extensionSubscriptionRef.current) {
        unsubscribeFromChannel(extensionSubscriptionRef.current);
      }
      // Clear checked conflicts on unmount using captured ref
      currentCheckedConflictsRef.clear();
    };
  }, [setExtensions]); // Include setExtensions in dependencies

  const checkConflictForExtension = useCallback(async (extensionId, rentalId, newEndDate) => {
    try {
      setCheckingConflicts(prev => ({ ...prev, [extensionId]: true }));
      const result = await checkCameraAvailabilityForExtension(rentalId, newEndDate);
      
      setConflicts(prev => ({
        ...prev,
        [extensionId]: {
          hasConflict: !result.isAvailable,
          message: result.error || 'Camera is available for extension'
        }
      }));
    } catch (error) {
      console.error('Error checking conflicts:', error);
      setConflicts(prev => ({
        ...prev,
        [extensionId]: {
          hasConflict: true,
          message: 'Unable to check availability'
        }
      }));
    } finally {
      setCheckingConflicts(prev => ({ ...prev, [extensionId]: false }));
    }
  }, []); // Empty dependency array since it only uses state setters

  useEffect(() => {
    // When extensions from the store change, check for conflicts (only for pending extensions)
    if (pendingExtensions.length > 0 && storeReady) {
      // Capture the ref value to avoid stale closure issues in cleanup
      const currentCheckedConflicts = checkedConflictsRef.current;
      
      pendingExtensions.forEach(ext => {
        // Only check conflicts for pending extensions that haven't been checked yet
        if (!currentCheckedConflicts.has(ext.id)) {
          currentCheckedConflicts.add(ext.id);
          checkConflictForExtension(ext.id, ext.rental_id, ext.requested_end_date);
        }
      });
    }
  }, [pendingExtensions, storeReady, checkConflictForExtension]);

  const handleApproveExtension = async (extensionId) => {
    // Check for conflicts first
    const conflict = conflicts[extensionId];
    if (conflict?.hasConflict) {
      toast.error('Cannot approve extension with camera availability conflicts');
      return;
    }

    try {
      setProcessingExtension(prev => ({ ...prev, [extensionId]: 'approving' }));
      const result = await adminApproveExtension(extensionId);
      
      if (result.success) {
        toast.success('Extension approved successfully!');
      } else {
        toast.error(result.error || 'Failed to approve extension');
      }
    } catch {
      toast.error('Error approving extension');
    } finally {
      setProcessingExtension(prev => ({ ...prev, [extensionId]: false }));
    }
  };

  const handleRejectExtension = async () => {
    if (!selectedExtension) return;

    try {
      setProcessingExtension(prev => ({ ...prev, [selectedExtension.id]: 'rejecting' }));
      const result = await adminRejectExtension(selectedExtension.id, user.id, rejectNotes);
      
      if (result.success) {
        toast.success('Extension request rejected');
        setShowRejectModal(false);
        setSelectedExtension(null);
        setRejectNotes('');
      } else {
        toast.error(result.error || 'Failed to reject extension');
      }
    } catch {
      toast.error('Error rejecting extension');
    } finally {
      setProcessingExtension(prev => ({ ...prev, [selectedExtension.id]: false }));
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Filter extensions based on search and status (use allExtensions from store)
  const filteredExtensions = allExtensions.filter(ext => {
    const matchesSearch = 
      ext.rentals?.cameras?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.rentals?.users?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.rentals?.users?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.rentals?.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.rentals?.id?.toLowerCase().includes(searchTerm.toLowerCase());

    // Show only pending by default, unless user changes filter
    const matchesStatus = statusFilter === 'all' || ext.extension_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading || !storeReady) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 sm:gap-3">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-blue-400" />
              <span className="text-sm sm:text-base text-gray-300">Loading extension requests...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white">Extension Requests</h1>
              <p className="text-xs sm:text-base text-gray-400">Manage rental extension requests from users</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            {[
              { 
                label: 'Pending Requests', 
                value: allExtensions.filter(e => e.extension_status === 'pending').length,
                color: 'from-amber-500 to-orange-500',
                icon: Clock
              },
              { 
                label: 'Approved Today', 
                value: allExtensions.filter(e => 
                  e.extension_status === 'approved' && 
                  new Date(e.approved_at).toDateString() === new Date().toDateString()
                ).length,
                color: 'from-green-500 to-emerald-500',
                icon: CheckCircle2
              },
              { 
                label: 'With Conflicts', 
                value: Object.values(conflicts).filter(c => c.hasConflict).length,
                color: 'from-red-500 to-rose-500',
                icon: AlertTriangle
              },
              { 
                label: 'Total Extensions', 
                value: allExtensions.length,
                color: 'from-blue-500 to-indigo-500',
                icon: Calendar
              }
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-gray-900 rounded-lg sm:rounded-xl border border-gray-800 p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                      <Icon className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="bg-gray-900 rounded-lg sm:rounded-xl border border-gray-800 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by camera, user name, email, or rental ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md sm:rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 sm:px-4 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-md sm:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Extension Cards */}
        {filteredExtensions.length === 0 ? (
          <div className="bg-gray-900 rounded-lg sm:rounded-xl border border-gray-800 p-6 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gray-800 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">No Extension Requests</h3>
            <p className="text-sm text-gray-400">
              {searchTerm || statusFilter !== 'pending' 
                ? 'No extension requests match your filters.' 
                : 'No pending extension requests found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredExtensions.map((extension) => {
              const conflict = conflicts[extension.id];
              const isProcessing = processingExtension[extension.id];
              const isCheckingConflict = checkingConflicts[extension.id];
              const rental = extension.rentals;
              const camera = rental?.cameras;
              const renter = rental?.users;

              return (
                <div key={extension.id} className="bg-gray-800 rounded-lg sm:rounded-xl border border-gray-700 overflow-hidden">
                  {/* Header */}
                  <div className={`px-3 sm:px-6 py-3 sm:py-4 border-b ${
                    extension.extension_status === 'pending' 
                      ? 'bg-amber-900/20 border-amber-800' 
                      : extension.extension_status === 'approved'
                      ? 'bg-green-900/20 border-green-800'
                      : 'bg-red-900/20 border-red-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-lg flex items-center justify-center ${
                          extension.extension_status === 'pending'
                            ? 'bg-amber-900/30 text-amber-400'
                            : extension.extension_status === 'approved'
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {extension.extension_status === 'pending' ? (
                            <Clock className="w-3 h-3 sm:w-5 sm:h-5" />
                          ) : extension.extension_status === 'approved' ? (
                            <CheckCircle2 className="w-3 h-3 sm:w-5 sm:h-5" />
                          ) : (
                            <XCircle className="w-3 h-3 sm:w-5 sm:h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <h3 className="text-sm sm:text-base font-semibold text-white">{camera?.name}</h3>
                            <span className="text-gray-500 hidden sm:block">•</span>
                            <span className="text-xs sm:text-sm font-medium text-gray-300">
                              {renter?.first_name} {renter?.last_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mt-1">
                            <span>Rental #{rental?.id?.slice(0, 8)}</span>
                            <span className="hidden sm:block">•</span>
                            <span className="hidden sm:block">Requested {formatDateTime(extension.requested_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Conflict Indicator */}
                        {isCheckingConflict ? (
                          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full text-xs sm:text-sm">
                            <Loader2 className="w-2 h-2 sm:w-3 sm:h-3 animate-spin" />
                            <span className="hidden sm:block">Checking...</span>
                          </div>
                        ) : conflict?.hasConflict ? (
                          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-xs sm:text-sm">
                            <AlertTriangle className="w-2 h-2 sm:w-3 sm:h-3" />
                            <span className="hidden sm:block">Conflict</span>
                          </div>
                        ) : conflict ? (
                          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-xs sm:text-sm">
                            <CheckCircle2 className="w-2 h-2 sm:w-3 sm:h-3" />
                            <span className="hidden sm:block">Available</span>
                          </div>
                        ) : null}

                        {/* Status Badge */}
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                          extension.extension_status === 'pending'
                            ? 'bg-amber-900/30 text-amber-400'
                            : extension.extension_status === 'approved'
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {extension.extension_status.charAt(0).toUpperCase() + extension.extension_status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3 sm:p-6">
                    {/* Conflict Warning */}
                    {conflict?.hasConflict && (
                      <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-900/20 border border-red-800 rounded-lg">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm sm:text-base font-medium text-red-400 mb-1">Availability Conflict</h4>
                            <p className="text-xs sm:text-sm text-red-300">{conflict.message}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Extension Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                      <div className="bg-gray-900/50 rounded-md sm:rounded-lg p-2 sm:p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1 sm:mb-2">
                          Current End Date
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-white">
                          {formatDate(extension.original_end_date)}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded-md sm:rounded-lg p-2 sm:p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1 sm:mb-2">
                          Requested End Date
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-white">
                          {formatDate(extension.requested_end_date)}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded-md sm:rounded-lg p-2 sm:p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1 sm:mb-2">
                          Extension Days
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-white">
                          {extension.extension_days} day{extension.extension_days !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded-md sm:rounded-lg p-2 sm:p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1 sm:mb-2">
                          Additional Cost
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-white flex items-center gap-1">
                          <PhilippinePeso className="w-2 h-2 sm:w-3 sm:h-3" />
                          {Number(extension.additional_price).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Renter Information */}
                    <div className="bg-gray-900/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                        <h4 className="text-sm sm:text-base font-medium text-blue-400">Renter Information</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <span className="text-blue-400 font-medium">Name:</span>
                          <span className="text-blue-300 ml-2">
                            {renter?.first_name} {renter?.last_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-400 font-medium">Email:</span>
                          <span className="text-blue-300 ml-2">{renter?.email}</span>
                        </div>
                        <div>
                          <span className="text-blue-400 font-medium">Contact:</span>
                          <span className="text-blue-300 ml-2">{renter?.contact_number}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions for Pending Extensions */}
                    {extension.extension_status === 'pending' && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                          onClick={() => handleApproveExtension(extension.id)}
                          disabled={isProcessing || conflict?.hasConflict}
                          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm sm:text-base rounded-md sm:rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {isProcessing === 'approving' ? (
                            <>
                              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                              <span className="text-xs sm:text-sm">Approving...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-sm">Approve Extension</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExtension(extension);
                            setShowRejectModal(true);
                          }}
                          disabled={isProcessing}
                          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 border border-red-700 text-red-400 font-medium text-sm sm:text-base rounded-md sm:rounded-lg hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {isProcessing === 'rejecting' ? (
                            <>
                              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                              <span className="text-xs sm:text-sm">Rejecting...</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-sm">Reject Request</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Admin Notes for Rejected Extensions */}
                    {extension.extension_status === 'rejected' && extension.admin_notes && (
                      <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm sm:text-base font-medium text-red-400 mb-1">Rejection Notes</h4>
                            <p className="text-xs sm:text-sm text-red-300">{extension.admin_notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedExtension && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg sm:rounded-xl border border-gray-700 p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                Reject Extension Request
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                Are you sure you want to reject this extension request? Please provide a reason for the user.
              </p>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Reason for rejection (optional but recommended)..."
                className="w-full p-2 sm:p-3 bg-gray-800 border border-gray-700 text-white text-sm rounded-md sm:rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 placeholder-gray-500 mb-3 sm:mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleRejectExtension}
                  disabled={processingExtension[selectedExtension.id]}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingExtension[selectedExtension.id] === 'rejecting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm">Confirm Reject</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedExtension(null);
                    setRejectNotes('');
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-700 text-gray-400 font-medium text-sm rounded-md sm:rounded-lg hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Extensions;