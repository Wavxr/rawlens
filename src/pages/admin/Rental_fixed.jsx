import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  User, 
  Calendar, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  Search, 
  Edit, 
  Trash2, 
  FileText, 
  X, 
  AlertCircle, 
  Loader2, 
  Truck, 
  MessageSquare, 
  Eye, 
  ExternalLink, 
  UserCheck, 
  Camera 
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import { rentalService } from "../../services/rentalService";
import { storageService } from "../../services/storageService";
import { userService } from "../../services/userService";
import RentalStepper from "../../components/RentalStepper";
import "react-toastify/dist/ReactToastify.css";

const Rental = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rentals, setRentals] = useState([]);
  const [allRentals, setAllRentals] = useState([]);
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || "needs_action");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [contractViewError, setContractViewError] = useState({});

  useEffect(() => {
    fetchRentals();
  }, []);

  useEffect(() => {
    filterRentals();
  }, [allRentals, selectedStatus, searchTerm]);

  const fetchRentals = async () => {
    try {
      setLoading(true);
      const data = await rentalService.getRentals();
      setAllRentals(data);
    } catch (error) {
      console.error("Failed to fetch rentals:", error);
      toast.error("Failed to load rentals. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const needsAdminAction = (rental) => {
    return (
      rental.rental_status === "pending" ||
      (rental.rental_status === "confirmed" && rental.shipping_status === "pending") ||
      (rental.rental_status === "confirmed" && rental.shipping_status === "preparing") ||
      (rental.rental_status === "active" && rental.shipping_status === "delivered") ||
      (rental.shipping_status === "returned" && rental.rental_status !== "completed")
    );
  };

  const filterRentals = () => {
    let filtered = allRentals;

    // Filter by status
    if (selectedStatus === "needs_action") {
      filtered = filtered.filter((rental) => needsAdminAction(rental));
    } else {
      filtered = filtered.filter((rental) => rental.rental_status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((rental) => {
        const customerName = rental.customer_name || 
                           (rental.users ? `${rental.users.first_name} ${rental.users.last_name}`.trim() : '');
        const customerEmail = rental.customer_email || rental.users?.email || '';
        const cameraName = rental.cameras?.name || '';
        
        return (
          customerName.toLowerCase().includes(search) ||
          customerEmail.toLowerCase().includes(search) ||
          cameraName.toLowerCase().includes(search)
        );
      });
    }

    setRentals(filtered);
  };

  const handleViewDetails = async (rental) => {
    try {
      setSelectedRental(rental);
      
      // Fetch user details if available
      if (rental.user_id) {
        const userData = await userService.getUser(rental.user_id);
        setSelectedUser(userData);
      } else {
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      toast.error("Failed to load user details");
    }
  };

  const handleDeleteRental = async (rentalId) => {
    try {
      setActionLoading(prev => ({ ...prev, [rentalId]: "delete" }));
      
      await rentalService.deleteRental(rentalId);
      
      setAllRentals(prev => prev.filter(rental => rental.id !== rentalId));
      setShowDeleteConfirm(null);
      toast.success("Rental deleted successfully");
    } catch (error) {
      console.error("Failed to delete rental:", error);
      toast.error("Failed to delete rental. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, [rentalId]: null }));
    }
  };

  const handleViewContract = async (rental) => {
    if (contractViewError[rental.id]) {
      setContractViewError(prev => ({ ...prev, [rental.id]: null }));
    }

    try {
      if (!rental.contract_signed) {
        setContractViewError(prev => ({ 
          ...prev, 
          [rental.id]: "No signed contract available for this rental." 
        }));
        return;
      }

      setActionLoading(prev => ({ ...prev, [rental.id]: "viewContract" }));
      
      const signedUrl = await storageService.getSignedUrl(`contracts/${rental.id}.pdf`);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error("Failed to get contract URL:", error);
      setContractViewError(prev => ({ 
        ...prev, 
        [rental.id]: "Failed to load contract. Please try again." 
      }));
    } finally {
      setActionLoading(prev => ({ ...prev, [rental.id]: null }));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-900 text-yellow-200 border-yellow-700",
      confirmed: "bg-blue-900 text-blue-200 border-blue-700",
      active: "bg-green-900 text-green-200 border-green-700",
      completed: "bg-purple-900 text-purple-200 border-purple-700",
      cancelled: "bg-red-900 text-red-200 border-red-700",
    };
    return colors[status] || colors.pending;
  };

  const getStatusText = (status) => {
    const statusTexts = {
      pending: "Pending Review",
      confirmed: "Confirmed",
      active: "Active Rental",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return statusTexts[status] || "Unknown";
  };

  const prettyShippingStatus = (status) => {
    const statusTexts = {
      pending: "Pending Shipment",
      preparing: "Preparing for Shipment",
      shipped: "In Transit",
      delivered: "Delivered to Customer",
      returned: "Returned by Customer",
      received: "Received by Company",
    };
    return statusTexts[status] || "Unknown";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const RentalCard = ({ rental }) => {
    const isTemporaryBooking = rental?.booking_type === 'temporary';
    const customerName = rental?.customer_name || 
                        (rental?.users ? `${rental.users.first_name} ${rental.users.last_name}`.trim() : '') ||
                        'Unknown Customer';
    const customerEmail = rental?.customer_email || rental?.users?.email || 'No email';

    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 md:p-6 hover:border-gray-600 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Camera className="h-8 w-8 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {rental.cameras?.name || "Camera Equipment"}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <User className="h-4 w-4" />
                    <span className="truncate">{customerName}</span>
                    {isTemporaryBooking && (
                      <span className="px-2 py-1 bg-orange-900/20 border border-orange-700 rounded text-orange-200 text-xs font-medium ml-2">
                        Instagram Customer
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(rental.rental_status)}`}>
                  {getStatusText(rental.rental_status)}
                </span>
                {needsAdminAction(rental) && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-900 text-amber-200 border border-amber-700">
                    Needs Action
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center space-x-2 text-gray-300">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDate(rental.start_date)} - {formatDate(rental.end_date)}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span>{formatCurrency(rental.total_price)}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Package className="h-4 w-4 text-gray-400" />
                <span>{prettyShippingStatus(rental.shipping_status)}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>
                  {Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000 * 3600 * 24))} days
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:gap-2">
            <button
              onClick={() => handleViewDetails(rental)}
              className="inline-flex items-center justify-center space-x-1 md:space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
            >
              <Eye className="h-3 w-3 md:h-4 md:w-4" />
              <span>View Details</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleViewContract(rental)}
                disabled={actionLoading[rental.id] === "viewContract"}
                className="inline-flex items-center space-x-1 md:space-x-2 text-gray-300 hover:text-white text-xs md:text-sm font-medium"
              >
                {actionLoading[rental.id] === "viewContract" ? (
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                ) : (
                  <FileText className="h-3 w-3 md:h-4 md:w-4" />
                )}
                <span>Contract</span>
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(rental.id);
                }}
                disabled={actionLoading[rental.id] === "delete"}
                className="inline-flex items-center space-x-1 md:space-x-2 text-red-400 hover:text-red-300 text-xs md:text-sm font-medium ml-auto"
              >
                {actionLoading[rental.id] === "delete" ? (
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
          {contractViewError[rental.id] && (
            <div className="mt-3 p-2 md:p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300 text-xs md:text-sm">{contractViewError[rental.id]}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const statusFilters = [
    { key: "needs_action", label: "Needs Action", count: allRentals.filter((r) => needsAdminAction(r)).length },
    { key: "pending", label: "Pending", count: allRentals.filter((r) => r.rental_status === "pending").length },
    { key: "confirmed", label: "Confirmed", count: allRentals.filter((r) => r.rental_status === "confirmed").length },
    { key: "active", label: "Active", count: allRentals.filter((r) => r.rental_status === "active").length },
    { key: "completed", label: "Completed", count: allRentals.filter((r) => r.rental_status === "completed").length },
    { key: "cancelled", label: "Cancelled", count: allRentals.filter((r) => r.rental_status === "cancelled").length },
  ]

  const handleStatusChange = (status) => {
    setSelectedStatus(status)
    const newParams = new URLSearchParams(searchParams);
    newParams.set('status', status);
    setSearchParams(newParams);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading rental management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover
        theme="light"
        />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Rental Management</h1>
          <p className="text-gray-300">
            Manage rental applications, agreements, and customer relationships efficiently.
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by customer name, email, or equipment..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => handleStatusChange(filter.key)}
                className={`
                  inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200
                  ${
                    selectedStatus === filter.key
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:shadow-sm"
                  }
                `}
              >
                <span>{filter.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    selectedStatus === filter.key ? "bg-blue-500 text-white" : "bg-gray-600 text-gray-300"
                  }`}
                >
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        {rentals.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No rentals found</h3>
            <p className="text-gray-300">
              {searchTerm
                ? "No rentals match your search criteria. Try adjusting your filters."
                : "There are no rentals with the selected status at this time."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rentals.map((rental) => (
              <RentalCard key={rental.id} rental={rental} />
            ))}
          </div>
        )}
        {selectedRental && <RentalDetailModal rental={selectedRental} onClose={() => { setSelectedRental(null); setSelectedUser(null); }} />}
        {showDeleteConfirm && (
          <DeleteConfirmModal
            rentalId={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(null)}
            onConfirm={handleDeleteRental}
          />
        )}
      </div>
    </div>
  )
}

// Modal Components - defined outside main component
const RentalDetailModal = ({ rental, onClose }) => {
  const navigate = useNavigate();
  const isTemporaryBooking = rental?.booking_type === 'temporary';
  const customerName = rental?.customer_name || 
                      (rental?.users ? `${rental.users.first_name} ${rental.users.last_name}`.trim() : '') ||
                      'Unknown Customer';
  const customerEmail = rental?.customer_email || rental?.users?.email || 'No email';
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Rental Details</h2>
              <p className="text-gray-300 mt-1">{rental.cameras?.name}</p>
              {isTemporaryBooking && (
                <div className="mt-2 px-3 py-1 bg-orange-900/20 border border-orange-700 rounded-lg inline-block">
                  <span className="text-orange-200 text-sm font-medium">Admin Managed (Instagram Customer)</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigate(`/admin/delivery?rentalId=${rental.id}`);
                }}
                className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Truck className="mr-1.5 h-4 w-4" />
                Manage Logistics
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors p-2">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="space-y-6">
            <RentalStepper rental={rental} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Customer Information</h3>
                <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-white">{customerName}</p>
                      <p className="text-sm text-gray-300">{customerEmail}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-600">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-white">
                        {rental?.customer_contact || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Address</p>
                      <p className="text-sm text-white">Not provided</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Rental & Equipment</h3>
                <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Rental Status: {rental?.rental_status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Shipping Status: {rental?.shipping_status}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Equipment</p>
                      <p className="text-sm font-medium text-white">{rental.cameras?.name || "Camera Equipment"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Total Price</p>
                      <p className="text-sm font-medium text-white">₱{rental.total_price?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Start Date</p>
                      <p className="text-sm font-medium text-white">{new Date(rental.start_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">End Date</p>
                      <p className="text-sm font-medium text-white">{new Date(rental.end_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Duration</p>
                      <p className="text-sm font-medium text-white">
                        {Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000 * 3600 * 24))} days
                      </p>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ rentalId, onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 mb-4">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Delete Rental</h3>
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete this rental? This action cannot be undone and will permanently remove all
          associated data.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(rentalId)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center justify-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default Rental;
