import { useState, useEffect } from "react";
import useRentalStore from "../../stores/rentalStore";
import { subscribeToRentalUpdates, unsubscribeFromRentalUpdates } from "../../services/realtimeService";
import { useNavigate } from "react-router-dom"
import {
  Calendar,
  User,
  Clock,
  AlertCircle,
  Truck,
  Search,
  Check,
  X,
  FileText,
  Trash2,
  Loader2,
  DollarSign,
  Eye,
} from "lucide-react"
import { 
  adminConfirmApplication, 
  adminRejectApplication, 
  adminStartRental, 
  adminCompleteRental, 
  adminCancelRental, 
  adminDeleteRental 
} from "../../services/rentalService"
import { getSignedContractUrl } from "../../services/pdfService"
import RentalStepper from "../../components/RentalStepper"
import { fetchUserById } from "../../services/userService"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export default function Rentals() {
  const navigate = useNavigate();
  const { allRentals, loadAllRentals, loading } = useRentalStore();
  const [rentals, setRentals] = useState([]);
  const [actionLoading, setActionLoading] = useState({})
  const [contractViewLoading, setContractViewLoading] = useState({})
  const [contractViewError, setContractViewError] = useState({})
  const [selectedStatus, setSelectedStatus] = useState("needs_action")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRental, setSelectedRental] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  useEffect(() => {
    loadAllRentals();

    const channel = subscribeToRentalUpdates(null, 'admin');

    return () => {
      unsubscribeFromRentalUpdates(channel);
    };
  }, [loadAllRentals]);

  const needsAdminAction = (rental) => {
    return (
      rental.rental_status === "pending" ||
      (rental.rental_status === "confirmed" && rental.shipping_status === "in_transit_to_owner")
    )
  }

  const handleViewDetails = async (rental) => {
    setSelectedRental(rental)
    try {
      const userData = await fetchUserById(rental.user_id)
      setSelectedUser(userData)
    } catch (error) {
      toast.error("Failed to load user details")
      setSelectedUser(null)
    }
  }

  useEffect(() => {
    let filtered = allRentals

    if (selectedStatus === "needs_action") {
      filtered = filtered.filter(needsAdminAction)
    } else {
      filtered = filtered.filter((rental) => rental.rental_status === selectedStatus)
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((rental) => {
        const fullName = `${rental.users?.first_name || ""} ${rental.users?.last_name || ""}`.toLowerCase()
        return (
          fullName.includes(searchLower) ||
          rental.users?.email?.toLowerCase().includes(searchLower) ||
          rental.cameras?.name?.toLowerCase().includes(searchLower)
        )
      })
    }
    setRentals(filtered)
  }, [selectedStatus, searchTerm, allRentals])

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-600 border-gray-200"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Pending Review"
      case "confirmed":
        return "Confirmed"
      case "active":
        return "Active Rental"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      case "rejected":
        return "Rejected"
      default:
        return status || "Unknown"
    }
  }

  const getShippingBadgeClasses = (status) => {
    switch (status) {
      case "ready_to_ship":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "in_transit_to_user":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200"
      case "return_scheduled":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "in_transit_to_owner":
        return "bg-indigo-100 text-indigo-800 border-indigo-200"
      case "returned":
        return "bg-teal-100 text-teal-800 border-teal-200"
      default:
        return "bg-gray-100 text-gray-600 border-gray-200"
    }
  }

  const prettyShippingStatus = (status) => {
    if (!status) return "No Status"
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const STEP_ORDER = [
    "pending",
    "confirmed",
    "ready_to_ship",
    "in_transit_to_user",
    "delivered",
    "active",
    "return_scheduled",
    "in_transit_to_owner",
    "returned",
    "completed",
  ]
  const STEP_LABELS = {
    pending: "Application",
    confirmed: "Confirmed",
    ready_to_ship: "Ready",
    in_transit_to_user: "To User",
    delivered: "Delivered",
    active: "Active",
    return_scheduled: "Return",
    in_transit_to_owner: "To Owner",
    returned: "Returned",
    completed: "Completed",
  }
  function computeNowKey(r) {
    const rentalStatus = r?.rental_status
    const shippingStatus = r?.shipping_status
    if (rentalStatus === "completed" || shippingStatus === "returned") return "completed"
    if (shippingStatus === "in_transit_to_owner") return "in_transit_to_owner"
    if (shippingStatus === "return_scheduled") return "return_scheduled"
    if (rentalStatus === "active") return "active"
    if (shippingStatus === "delivered") return "delivered"
    if (shippingStatus === "in_transit_to_user") return "in_transit_to_user"
    if (shippingStatus === "ready_to_ship") return "ready_to_ship"
    if (rentalStatus === "confirmed") return "confirmed"
    return "pending"
  }
  function getNowNextLabels(r) {
    const nowKey = computeNowKey(r)
    const idx = Math.max(0, STEP_ORDER.indexOf(nowKey))
    const now = STEP_LABELS[STEP_ORDER[idx]]
    const next = STEP_LABELS[STEP_ORDER[idx + 1]]
    return { now, next }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleApprove = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "approve" }))
    try {
      const result = await adminConfirmApplication(rentalId);
      if (result.error) {
        toast.error(`Failed to approve rental: ${result.error}`);
        return;
      }
      toast.success("Rental approved successfully!");
    } catch (error) {
      toast.error("Failed to approve rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev }
        delete newLoading[rentalId]
        return newLoading
      })
    }
  }

  const handleReject = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "reject" }))
    try {
      const result = await adminRejectApplication(rentalId);
      if (result.error) {
        toast.error(`Failed to reject rental: ${result.error}`);
        return;
      }
      toast.success("Rental rejected successfully!");
    } catch (error) {
      toast.error("Failed to reject rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev }
        delete newLoading[rentalId]
        return newLoading
      })
    }
  }

  const handleStartRental = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "start" }))
    try {
      const result = await adminStartRental(rentalId);
      if (result.error) {
        toast.error(`Failed to start rental: ${result.error}`);
        return;
      }
      toast.success("Rental activated successfully!");
    } catch (error) {
      toast.error("Failed to start rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev }
        delete newLoading[rentalId]
        return newLoading
      })
    }
  }

  const handleCompleteRental = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "complete" }))
    try {
      const result = await adminCompleteRental(rentalId);
      if (result.error) {
        toast.error(`Failed to complete rental: ${result.error}`);
        return;
      }
      toast.success("Rental completed successfully!");
    } catch (error) {
      toast.error("Failed to complete rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev }
        delete newLoading[rentalId]
        return newLoading
      })
    }
  }

  const handleCancelRental = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "cancel" }))
    try {
      const result = await adminCancelRental(rentalId);
      if (result.error) {
        toast.error(`Failed to cancel rental: ${result.error}`);
        return;
      }
      toast.success("Rental cancelled successfully!");
    } catch (error) {
      toast.error("Failed to cancel rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev }
        delete newLoading[rentalId]
        return newLoading
      })
    }
  }

  const handleDeleteRental = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "delete" }))
    try {
      const result = await adminDeleteRental(rentalId);
      if (result.error) {
        toast.error(`Failed to delete rental: ${result.error}`);
        return;
      }
      toast.success("Rental deleted successfully!");
      setShowDeleteConfirm(null)
    } catch (error) {
      toast.error("Failed to delete rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev }
        delete newLoading[rentalId]
        return newLoading
      })
    }
  }

  const viewContract = async (rentalId, contractFilePath) => {
    if (!contractFilePath) {
      setContractViewError((prev) => ({ ...prev, [rentalId]: "Contract file path is missing." }))
      toast.warn("Contract file path is missing");
      return
    }

    setContractViewLoading((prev) => ({ ...prev, [rentalId]: true }))
    setContractViewError((prev) => {
      const newErrors = { ...prev }
      delete newErrors[rentalId]
      return newErrors
    })

    try {
      const signedUrl = await getSignedContractUrl(contractFilePath)
      window.open(signedUrl, "_blank", "noopener,noreferrer")
      toast.success("Opening contract in new tab");
    } catch (err) {
      toast.error("Could not generate link to view contract");
      setContractViewError((prev) => ({
        ...prev,
        [rentalId]: err.message || "Could not generate link to view contract.",
      }))
    } finally {
      setContractViewLoading((prev) => {
        const newLoading = { ...prev }
        delete newLoading[rentalId]
        return newLoading
      })
    }
  }

  const RentalCard = ({ rental }) => (
    <div className="bg-gray-800 rounded-xl border-2 border-gray-700 hover:border-gray-600 hover:shadow-lg transition-all duration-200">
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-1">{rental.cameras?.name || "Camera Equipment"}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <User className="h-4 w-4" />
              <span>
                {rental.users?.first_name} {rental.users?.last_name}
              </span>
              <span className="text-gray-500">•</span>
              <span>{rental.users?.email}</span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(rental.rental_status)}`}>
            {getStatusText(rental.rental_status)}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-700 rounded-lg">
            <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
            <div className="min-w-0">
              <p className="text-sm md:text-lg font-semibold text-white truncate">₱{rental.total_price?.toFixed(2) || "0.00"}</p>
              <p className="text-xs text-gray-300">Total Price</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-700 rounded-lg">
            <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-white truncate">{formatDate(rental.start_date)}</p>
              <p className="text-xs text-gray-300">Start Date</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-700 rounded-lg">
            <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-white truncate">{formatDate(rental.end_date)}</p>
              <p className="text-xs text-gray-300">End Date</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-700 rounded-lg">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-white truncate">
                {Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000 * 3600 * 24))} days
              </p>
              <p className="text-xs text-gray-300">Duration</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3 items-center">
          {rental.rental_status === "pending" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleApprove(rental.id)
                }}
                disabled={actionLoading[rental.id] === "approve"}
                className="inline-flex items-center space-x-1 md:space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading[rental.id] === "approve" ? (
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 md:h-4 md:w-4" />
                )}
                <span>Approve</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleReject(rental.id)
                }}
                disabled={actionLoading[rental.id] === "reject"}
                className="inline-flex items-center space-x-1 md:space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading[rental.id] === "reject" ? (
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                ) : (
                  <X className="h-3 w-3 md:h-4 md:w-4" />
                )}
                <span>Reject</span>
              </button>
            </>
          )}

          {rental.rental_status === "confirmed" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/admin/delivery?rentalId=${rental.id}`)
                }}
                className="inline-flex items-center space-x-1 md:space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
              >
                <Truck className="h-3 w-3 md:h-4 md:w-4" />
                <span>Manage Logistics</span>
              </button>
              
              {rental.shipping_status === "delivered" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartRental(rental.id)
                  }}
                  disabled={actionLoading[rental.id] === "start"}
                  className="inline-flex items-center space-x-1 md:space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading[rental.id] === "start" ? (
                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                  <span>Activate Rental</span>
                </button>
              )}
            </>
          )}

          {rental.contract_pdf_url && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                viewContract(rental.id, rental.contract_pdf_url)
              }}
              disabled={contractViewLoading[rental.id]}
              className="inline-flex items-center space-x-1 md:space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {contractViewLoading[rental.id] ? (
                <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
              ) : (
                <FileText className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span>View Contract</span>
            </button>
          )}

          <button
            onClick={() => handleViewDetails(rental)}
            className="inline-flex items-center space-x-1 md:space-x-2 text-gray-300 hover:text-white text-xs md:text-sm font-medium"
          >
            <Eye className="h-3 w-3 md:h-4 md:w-4" />
            <span>View Details</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteConfirm(rental.id)
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

        {contractViewError[rental.id] && (
          <div className="mt-3 p-2 md:p-3 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300 text-xs md:text-sm">{contractViewError[rental.id]}</p>
          </div>
        )}
      </div>
    </div>
  )

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
  }

  const RentalDetailModal = ({ rental, onClose }) => (
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
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors p-2">
              <X className="h-6 w-6" />
            </button>
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
                      <p className="font-medium text-white">
                        {selectedUser?.first_name} {selectedUser?.last_name}
                      </p>
                      <p className="text-sm text-gray-300">{selectedUser?.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-600">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-white">{selectedUser?.contact_number || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Address</p>
                      <p className="text-sm text-white">
                        {selectedUser?.address ? (
                          <>
                            {selectedUser.address}
                            {selectedUser.city && `, ${selectedUser.city}`}
                            {selectedUser.state && `, ${selectedUser.state}`}
                            {selectedUser.postal_code && ` ${selectedUser.postal_code}`}
                          </>
                        ) : (
                          "Not provided"
                        )}
                      </p>
                    </div>

                  </div>
                  
                  {selectedUser?.emergency_contact && (
                    <div className="pt-3 border-t border-gray-600">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Emergency Contact</p>
                      <div className="bg-gray-600 rounded p-3">
                        <p className="text-sm text-white font-medium">{selectedUser.emergency_contact.name}</p>
                        <p className="text-sm text-gray-300">{selectedUser.emergency_contact.phone}</p>
                        <p className="text-sm text-gray-300">{selectedUser.emergency_contact.relationship}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Rental & Equipment</h3>
                <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Rental Status: {getStatusText(selectedRental?.rental_status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Shipping Status: {prettyShippingStatus(selectedRental?.shipping_status)}</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Equipment</p>
                      <p className="text-sm font-medium text-white">{selectedRental.cameras?.name || "Camera Equipment"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Total Price</p>
                      <p className="text-sm font-medium text-white">₱{selectedRental.total_price?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Start Date</p>
                      <p className="text-sm font-medium text-white">{formatDate(selectedRental.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">End Date</p>
                      <p className="text-sm font-medium text-white">{formatDate(selectedRental.end_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Duration</p>
                      <p className="text-sm font-medium text-white">
                        {Math.ceil((new Date(selectedRental.end_date) - new Date(selectedRental.start_date)) / (1000 * 3600 * 24))} days
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
  )

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
              disabled={actionLoading[rentalId] === "delete"}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(rentalId)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center justify-center space-x-2"
              disabled={actionLoading[rentalId] === "delete"}
            >
              {actionLoading[rentalId] === "delete" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

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