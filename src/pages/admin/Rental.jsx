// admin/Rentals.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  Camera, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Package, 
  Search,
  Filter,
  Check,
  X,
  FileText,
  Trash2
} from 'lucide-react';
import * as rentalService from '../../services/rentalService';

export default function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [allRentals, setAllRentals] = useState([]); // Store all rentals
  const [loading, setLoading] = useState(true); // Only for initial load
  const [actionLoading, setActionLoading] = useState({}); // For individual actions
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRental, setSelectedRental] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // For delete confirmation

  // Fetch all rentals once
  useEffect(() => {
    fetchAllRentals();
  }, []);

  const fetchAllRentals = async () => {
    setLoading(true);
    try {
      const result = await rentalService.getRentalsByStatus();
      if (result.data) {
        setAllRentals(result.data);
        setRentals(result.data); // Initially show all rentals
      }
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh rentals data without showing loading spinner
  const refreshRentalsData = async () => {
    try {
      const result = await rentalService.getRentalsByStatus();
      if (result.data) {
        setAllRentals(result.data);
        // Re-apply current filters
        let filtered = result.data;
        if (selectedStatus !== 'all') {
          filtered = filtered.filter(rental => rental.rental_status === selectedStatus);
        }
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          filtered = filtered.filter(rental => {
            const fullName = `${rental.users?.first_name || ''} ${rental.users?.last_name || ''}`.toLowerCase();
            return (
              fullName.includes(searchLower) ||
              rental.users?.email?.toLowerCase().includes(searchLower) ||
              rental.cameras?.name?.toLowerCase().includes(searchLower)
            );
          });
        }
        setRentals(filtered);
      }
    } catch (error) {
      console.error('Error refreshing rentals:', error);
    }
  };

  // Filter rentals when status or search term changes
  useEffect(() => {
    let filtered = allRentals;
    
    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(rental => rental.rental_status === selectedStatus);
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(rental => {
        const fullName = `${rental.users?.first_name || ''} ${rental.users?.last_name || ''}`.toLowerCase();
        return (
          fullName.includes(searchLower) ||
          rental.users?.email?.toLowerCase().includes(searchLower) ||
          rental.cameras?.name?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    setRentals(filtered);
  }, [selectedStatus, searchTerm, allRentals]);

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'confirmed': return 'bg-blue-500/20 text-blue-400';
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'completed': return 'bg-purple-500/20 text-purple-400';
      case 'cancelled': return 'bg-gray-500/20 text-gray-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending Approval';
      case 'confirmed': return 'Confirmed';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Calculate counts for each status (based on all rentals)
  const getStatusCounts = () => {
    const counts = {
      all: allRentals.length,
      pending: 0,
      confirmed: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0
    };

    allRentals.forEach(rental => {
      if (counts.hasOwnProperty(rental.rental_status)) {
        counts[rental.rental_status]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  // Admin Actions
  const handleApprove = async (rentalId) => {
    setActionLoading(prev => ({ ...prev, [rentalId]: 'approve' }));
    try {
      await rentalService.adminConfirmApplication(rentalId);
      await refreshRentalsData(); // Refresh without loading spinner
    } catch (error) {
      console.error('Error approving rental:', error);
    } finally {
      setActionLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleReject = async (rentalId) => {
    setActionLoading(prev => ({ ...prev, [rentalId]: 'reject' }));
    try {
      await rentalService.adminRejectApplication(rentalId);
      await refreshRentalsData(); // Refresh without loading spinner
    } catch (error) {
      console.error('Error rejecting rental:', error);
    } finally {
      setActionLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleStartRental = async (rentalId) => {
    setActionLoading(prev => ({ ...prev, [rentalId]: 'start' }));
    try {
      await rentalService.adminStartRental(rentalId);
      await refreshRentalsData(); // Refresh without loading spinner
    } catch (error) {
      console.error('Error starting rental:', error);
    } finally {
      setActionLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleCompleteRental = async (rentalId) => {
    setActionLoading(prev => ({ ...prev, [rentalId]: 'complete' }));
    try {
      await rentalService.adminCompleteRental(rentalId);
      await refreshRentalsData(); // Refresh without loading spinner
    } catch (error) {
      console.error('Error completing rental:', error);
    } finally {
      setActionLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleCancelRental = async (rentalId) => {
    setActionLoading(prev => ({ ...prev, [rentalId]: 'cancel' }));
    try {
      await rentalService.adminCancelRental(rentalId);
      await refreshRentalsData(); // Refresh without loading spinner
    } catch (error) {
      console.error('Error cancelling rental:', error);
    } finally {
      setActionLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleDeleteRental = async (rentalId) => {
    setActionLoading(prev => ({ ...prev, [rentalId]: 'delete' }));
    try {
      await rentalService.adminDeleteRental(rentalId);
      await refreshRentalsData(); // Refresh without loading spinner
      setShowDeleteConfirm(null); // Close confirmation
    } catch (error) {
      console.error('Error deleting rental:', error);
    } finally {
      setActionLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const viewContract = (contractUrl) => {
    if (contractUrl) {
      window.open(contractUrl, '_blank');
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              Status Filter Tabs                            */
  /* -------------------------------------------------------------------------- */

  const statusFilters = [
    { key: 'all', label: 'All Rentals', count: statusCounts.all },
    { key: 'pending', label: 'Pending', count: statusCounts.pending },
    { key: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed },
    { key: 'active', label: 'Active', count: statusCounts.active },
    { key: 'completed', label: 'Completed', count: statusCounts.completed },
    { key: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled },
    { key: 'rejected', label: 'Rejected', count: statusCounts.rejected }
  ];

  /* -------------------------------------------------------------------------- */
  /*                              Rental Card Component                         */
  /* -------------------------------------------------------------------------- */

  const RentalCard = ({ rental }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
      {/* Clickable card area for viewing details */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setSelectedRental(rental)}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-white font-semibold text-lg">{rental.cameras?.name || 'Camera Name'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rental.rental_status)}`}>
              {getStatusText(rental.rental_status)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-gray-400" />
            <div>
              <p className="text-white text-sm">
                {rental.users?.first_name} {rental.users?.last_name}
              </p>
              <p className="text-gray-400 text-xs">{rental.users?.email || 'No email'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <div>
              <p className="text-white text-sm">{formatDate(rental.start_date)}</p>
              <p className="text-gray-400 text-xs">to {formatDate(rental.end_date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Package size={16} className="text-gray-400" />
            <div>
              <p className="text-white text-sm">₱{rental.total_price?.toFixed(2) || '0.00'}</p>
              <p className="text-gray-400 text-xs">Total Price</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <div>
              <p className="text-white text-sm">
                {Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000 * 3600 * 24))} days
              </p>
              <p className="text-gray-400 text-xs">Rental Period</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-2 items-center">
          {rental.rental_status === 'pending' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(rental.id);
                }}
                disabled={actionLoading[rental.id] === 'approve'}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === 'approve' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <Check size={14} />
                )}
                Approve
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(rental.id);
                }}
                disabled={actionLoading[rental.id] === 'reject'}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === 'reject' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <X size={14} />
                )}
                Reject
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelRental(rental.id);
                }}
                disabled={actionLoading[rental.id] === 'cancel'}
                className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === 'cancel' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <XCircle size={14} />
                )}
                Cancel
              </button>
              {rental.contract_pdf_url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    viewContract(rental.contract_pdf_url);
                  }}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  <FileText size={14} />
                  View Contract
                </button>
              )}
            </>
          )}

          {rental.rental_status === 'confirmed' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartRental(rental.id);
                }}
                disabled={actionLoading[rental.id] === 'start'}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === 'start' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle size={14} />
                )}
                Start Rental
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelRental(rental.id);
                }}
                disabled={actionLoading[rental.id] === 'cancel'}
                className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === 'cancel' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <XCircle size={14} />
                )}
                Cancel
              </button>
              {rental.contract_pdf_url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    viewContract(rental.contract_pdf_url);
                  }}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  <FileText size={14} />
                  View Contract
                </button>
              )}
            </>
          )}

          {rental.rental_status === 'active' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompleteRental(rental.id);
                }}
                disabled={actionLoading[rental.id] === 'complete'}
                className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === 'complete' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle size={14} />
                )}
                Complete
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelRental(rental.id);
                }}
                disabled={actionLoading[rental.id] === 'cancel'}
                className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === 'cancel' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <XCircle size={14} />
                )}
                Cancel
              </button>
              {rental.contract_pdf_url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    viewContract(rental.contract_pdf_url);
                  }}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  <FileText size={14} />
                  View Contract
                </button>
              )}
            </>
          )}

          {(rental.rental_status === 'completed' || rental.rental_status === 'cancelled' || rental.rental_status === 'rejected') && (
            <>
              {rental.contract_pdf_url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    viewContract(rental.contract_pdf_url);
                  }}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  <FileText size={14} />
                  View Contract
                </button>
              )}
            </>
          )}

          {/* Delete Button  */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(rental.id);
            }}
            disabled={actionLoading[rental.id] === 'delete'}
            className="flex ml-auto items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
          >
            {actionLoading[rental.id] === 'delete' ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
            ) : (
              <Trash2 size={14} />
            )}
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm === rental.id && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div 
            className="bg-gray-800 border border-gray-700 rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">Delete Rental</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete this rental? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                  disabled={actionLoading[rental.id] === 'delete'}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteRental(rental.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                  disabled={actionLoading[rental.id] === 'delete'}
                >
                  {actionLoading[rental.id] === 'delete' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ) : null}
                  Delete Rental
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /*                              Rental Detail Modal                           */
  /* -------------------------------------------------------------------------- */

  const RentalDetailModal = ({ rental, onClose }) => (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-white">Rental Details</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rental.rental_status)}`}>
                    {getStatusText(rental.rental_status)}
                  </span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Created</p>
                  <p className="text-white">{new Date(rental.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Price</p>
                  <p className="text-white">₱{rental.total_price?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Rental Period</p>
                  <p className="text-white">
                    {formatDate(rental.start_date)} to {formatDate(rental.end_date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Full Name</p>
                  <p className="text-white">
                    {rental.users?.first_name} {rental.users?.middle_initial ? rental.users.middle_initial + '. ' : ''}{rental.users?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{rental.users?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Contact</p>
                  <p className="text-white">{rental.users?.contact_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Address</p>
                  <p className="text-white">{rental.users?.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Verification Status</p>
                  <p className="text-white">{rental.users?.verification_status || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Camera Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Camera Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Camera</p>
                  <p className="text-white">{rental.cameras?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Rental Duration</p>
                  <p className="text-white">
                    {Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000 * 3600 * 24))} days
                  </p>
                </div>
              </div>
            </div>

            {/* Contract */}
            {rental.contract_pdf_url && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Contract</h3>
                <button
                  onClick={() => viewContract(rental.contract_pdf_url)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
                >
                  <FileText size={16} />
                  View Signed Contract
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /*                              Main Component                                */
  /* -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Rental Management</h1>
          <p className="text-gray-400">Manage all camera rental requests and applications</p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by customer name, email, or camera..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-8 py-2 text-white focus:outline-none focus:border-blue-500 appearance-none"
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {statusFilters.map(filter => (
                <option key={filter.key} value={filter.key}>
                  {filter.label} ({filter.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {statusFilters.map(filter => (
              <button
                key={filter.key}
                onClick={() => handleStatusChange(filter.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === filter.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {filter.label} <span className="bg-gray-700 rounded-full px-2 py-0.5 ml-1">{filter.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rentals Grid */}
        {rentals.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-gray-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No rentals found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'No rentals match your search criteria.' : 'There are no rentals with the selected status.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rentals.map(rental => (
              <RentalCard key={rental.id} rental={rental} />
            ))}
          </div>
        )}

        {/* Rental Detail Modal */}
        {selectedRental && (
          <RentalDetailModal 
            rental={selectedRental} 
            onClose={() => setSelectedRental(null)} 
          />
        )}
      </div>
    </div>
  );
}