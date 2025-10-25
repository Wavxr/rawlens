import { useEffect, useMemo, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import useAuthStore from "../../stores/useAuthStore"
import useRentalStore from "../../stores/rentalStore"
import { userConfirmDelivered, userConfirmSentBack } from "../../services/deliveryService"
import { userCancelConfirmedRental } from "../../services/rentalService"
import { getSignedContractUrl } from "../../services/pdfService"
import { subscribeToUserRentals, subscribeToUserExtensions, subscribeToUserPayments, unsubscribeFromChannel } from "../../services/realtimeService"
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
  CameraIcon,
  Calendar,
  Timer,
  PhilippinePeso,
  ArrowRight,
  CreditCard,
  ExternalLink,
  XCircle,
  Upload,
} from "lucide-react"
import FeedbackForm from "../../components/forms/FeedbackForm";
import CancellationModal from "../../components/modals/CancellationModal";
import PaymentDetails from "../../components/payment/PaymentDetails";
import RentalExtensionManager from "../../components/rental/RentalExtensionManager";
import { getRentalFeedback } from "../../services/feedbackService";
import { AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

// Main Component
export default function Rentals() {
  // State Management
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const {
    rentals: allRentals,
    loading,
    error,
    loadRentals,
    setError,
  } = useRentalStore();
  const [actionLoading, setActionLoading] = useState({})
  const [contractViewLoading, setContractViewLoading] = useState({})
  const [contractViewError, setContractViewError] = useState({})
  const [activeFilter, setActiveFilter] = useState("payment_pending")
  const [selectedRental, setSelectedRental] = useState(null)
  const rentalSubscriptionRef = useRef(null);
  const extensionSubscriptionRef = useRef(null);
  const paymentSubscriptionRef = useRef(null);
  const [now, setNow] = useState(Date.now())
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState({});
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [rentalToCancel, setRentalToCancel] = useState(null);

  // Time Management: Update time every minute
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // Authentication & Data Loading: Load rentals when user is authenticated
  useEffect(() => {
    if (!authLoading && user?.id) {
      loadRentals(user.id);

        // Subscribe to user rentals
        if (!rentalSubscriptionRef.current) {
          rentalSubscriptionRef.current = subscribeToUserRentals(user.id);
        }

        // Subscribe to user extensions
        if (!extensionSubscriptionRef.current) {
          extensionSubscriptionRef.current = subscribeToUserExtensions(user.id, (payload) => {
            console.log('Extension update received in Booking:', payload);
            loadRentals(user.id); // Refresh rentals to get updated extension data
          });
        }

        // Subscribe to user payments
        if (!paymentSubscriptionRef.current) {
          paymentSubscriptionRef.current = subscribeToUserPayments(user.id, (payload) => {
            console.log('Payment update received in Booking:', payload);
            loadRentals(user.id); // Refresh rentals to get updated payment status
          });
        }

      return () => {
        // Clean up subscriptions
        if (rentalSubscriptionRef.current) {
          unsubscribeFromChannel(rentalSubscriptionRef.current);
          rentalSubscriptionRef.current = null;
        }
        if (extensionSubscriptionRef.current) {
          unsubscribeFromChannel(extensionSubscriptionRef.current);
          extensionSubscriptionRef.current = null;
        }
        if (paymentSubscriptionRef.current) {
          unsubscribeFromChannel(paymentSubscriptionRef.current);
          paymentSubscriptionRef.current = null;
        }
      };
    }
  }, [authLoading, user?.id, loadRentals]);

  // Rental Selection: Update selected rental when rentals change
  useEffect(() => {
    if (selectedRental && allRentals.length > 0) {
      const updatedRental = allRentals.find(r => r.id === selectedRental.id)
      if (updatedRental && JSON.stringify(updatedRental) !== JSON.stringify(selectedRental)) {
        setSelectedRental(updatedRental)
      }
    }
  }, [allRentals, selectedRental])

  // Feedback Check: Check if feedback already exists for completed rentals
  useEffect(() => {
    async function checkExistingFeedback() {
      if (selectedRental && user?.id && 
          (selectedRental.rental_status === "completed" || selectedRental.rental_status === "active")) {
        try {
          const existingFeedback = await getRentalFeedback(selectedRental.id);
          setFeedbackSubmitted(prev => ({
            ...prev,
            [selectedRental.id]: !!existingFeedback
          }));
        } catch (error) {
          console.error("Error checking feedback:", error);
        }
      }
    }
    checkExistingFeedback();
  }, [selectedRental, user?.id]);

  // Data Processing: Filter rentals to exclude pending/rejected
  const rentals = useMemo(() => 
    allRentals.filter((r) => !["pending", "rejected"].includes(r.rental_status)), 
    [allRentals]
  );

  // Data Processing: Filter rentals based on active tab
  const displayedRentals = useMemo(() => {
    if (activeFilter === "awaiting") {
      // Only show confirmed rentals that have verified payment
      return rentals.filter(
        (r) => r.rental_status === "confirmed" && r.payment_status === "verified" || 
               ["ready_to_ship", "in_transit_to_user"].includes(r.shipping_status)
      )
    }
    if (activeFilter === "payment_pending") {
      // Show confirmed rentals that need payment (exclude verified)
      return rentals.filter((r) => {
        const initialPayment = r.payments?.find(p => p.payment_type === 'rental' && !p.extension_id);
        const paymentStatus = initialPayment?.payment_status;
        return r.rental_status === "confirmed" && 
               paymentStatus !== "verified" &&
               (paymentStatus === "pending" || paymentStatus === "submitted" || paymentStatus === "rejected" || !paymentStatus);
      });
    }
    if (activeFilter === "active") {
      return rentals.filter(
        (r) => r.rental_status === "active" && (!r.shipping_status || r.shipping_status === "delivered" || r.shipping_status === "return_scheduled"),
      )
    }
    if (activeFilter === "returning") {
      return rentals.filter((r) => ["return_scheduled", "in_transit_to_owner", "returned"].includes(r.shipping_status))
    }
    return []
  }, [activeFilter, rentals])

  // Helper Functions: Date formatting
  function formatDate(dateStr) {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  // Helper Functions: Shipping steps configuration
  const shippingSteps = [
    { key: "ready_to_ship", label: "Packed", icon: Package },
    { key: "in_transit_to_user", label: "On the way", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle },
    { key: "return_scheduled", label: "Return scheduled", icon: Clock },
    { key: "in_transit_to_owner", label: "Returning", icon: Truck },
    { key: "returned", label: "Returned", icon: CheckCircle },
  ]

  // Helper Functions: Calculate current shipping step
  function computeCurrentStep(rental) {
    if (!rental?.shipping_status) {
      if (rental.rental_status === "confirmed") return 0
      if (rental.rental_status === "active") return 2
      return 0
    }
    const idx = shippingSteps.findIndex((s) => s.key === rental.shipping_status)
    return idx >= 0 ? idx : 0
  }

  // Helper Functions: Get status badge styling
  function getStatusBadgeClasses(status) {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-purple-100 text-purple-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Action Handlers: Refresh rental data
  async function refresh() {
    if (user?.id) {
      await loadRentals(user.id);
    }
  }

  // Action Handlers: Confirm delivery
  async function handleConfirmDelivered(rentalId) {
    setActionLoading((p) => ({ ...p, [rentalId]: "confirmDelivered" }))
    try {
      const res = await userConfirmDelivered(rentalId, user.id)
      if (!res?.success) throw new Error(res?.error || "Failed to confirm delivery")
      await refresh()
    } catch (e) {
      console.error(e)
      setError("Could not confirm delivery. Please try again.")
    } finally {
      setActionLoading((p) => {
        const next = { ...p }
        delete next[rentalId]
        return next
      })
    }
  }

  // Action Handlers: Confirm sent back
  async function handleConfirmSentBack(rentalId) {
    setActionLoading((p) => ({ ...p, [rentalId]: "confirmSentBack" }))
    try {
      const res = await userConfirmSentBack(rentalId, user.id)
      if (!res?.success) throw new Error(res?.error || "Failed to confirm return shipment")
      await refresh()
    } catch (e) {
      console.error(e)
      setError("Could not confirm the return shipment. Please try again.")
    } finally {
      setActionLoading((p) => {
        const next = { ...p }
        delete next[rentalId]
        return next
      })
    }
  }

  // Action Handlers: View contract
  async function viewContract(rentalId, contractFilePath) {
    if (!contractFilePath) {
      setContractViewError((p) => ({ ...p, [rentalId]: "No contract on file." }))
      return
    }
    setContractViewLoading((p) => ({ ...p, [rentalId]: true }))
    setContractViewError((p) => {
      const next = { ...p }
      delete next[rentalId]
      return next
    })
    try {
      const url = await getSignedContractUrl(contractFilePath)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e) {
      console.error("Contract view error:", e)
      setContractViewError((p) => ({ ...p, [rentalId]: e.message || "Could not open contract." }))
    } finally {
      setContractViewLoading((p) => {
        const next = { ...p }
        delete next[rentalId]
        return next
      })
    }
  }

  // Action Handlers: Handle feedback submission
  async function handleFeedbackSubmit() {
    setFeedbackSubmitted(prev => ({
      ...prev,
      [selectedRental.id]: true
    }));
    setShowFeedbackForm(false);
    await refresh();
  }

  // Action Handlers: Handle cancellation
  const handleCancelConfirmedRental = async (rentalId, reason) => {
    try {
      const result = await userCancelConfirmedRental(rentalId, reason);
      if (result.success) {
        toast.success('Rental cancelled successfully');
        setShowCancellationModal(false);
        setRentalToCancel(null);
        await refresh();
      } else {
        toast.error(result.error || 'Failed to cancel rental');
      }
    } catch (error) {
      toast.error('Failed to cancel rental', error);
    }
  };

  const handleOpenCancellation = (rental) => {
    setRentalToCancel(rental);
    setShowCancellationModal(true);
  };

  // Helper function to check if rental can be cancelled
  const canCancelConfirmed = (rental) => {
    if (rental.rental_status !== 'confirmed') return false;
    
    // Allow cancellation if shipping hasn't started or only in ready_to_ship status
    const prohibitedShippingStatuses = [
      'in_transit_to_user',
      'delivered', 
      'active',
      'return_scheduled',
      'in_transit_to_owner'
    ];
    
    return !rental.shipping_status || 
           rental.shipping_status === 'ready_to_ship' || 
           !prohibitedShippingStatuses.includes(rental.shipping_status);
  };

  // Helper Functions: Countdown timer
  function useCountdown(targetIso, { dir = "down", startDate = null, endDate = null } = {}) {
    if (!targetIso) return null
    
    if (startDate && endDate && dir === "down") {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(endDate)
      end.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() + 1)
      
      const nowTime = new Date(now)
      
      const startMs = start.getTime()
      const endMs = end.getTime()
      const nowMs = nowTime.getTime()
      
      const totalRentalMs = endMs - startMs
      const elapsedMs = nowMs - startMs
      const remainingMs = Math.max(0, totalRentalMs - elapsedMs)
      
      const days = Math.floor(remainingMs / (24 * 3600 * 1000))
      const hours = Math.floor((remainingMs % (24 * 3600 * 1000)) / (3600 * 1000))
      const minutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))
      
      return { days, hours, minutes, ms: remainingMs }
    }
    
    const target = new Date(targetIso).getTime()
    const diffMs = dir === "down" ? target - now : now - target
    const remaining = Math.max(diffMs, 0)
    const days = Math.floor(remaining / (24 * 3600 * 1000))
    const hours = Math.floor((remaining % (24 * 3600 * 1000)) / (3600 * 1000))
    const minutes = Math.floor((remaining % (3600 * 1000)) / (60 * 1000))
    return { days, hours, minutes, ms: remaining }
  }

  // Helper Functions: Calculate days until date
  function daysUntil(dateIso) {
    if (!dateIso) return Number.POSITIVE_INFINITY
    const start = new Date()
    const end = new Date(dateIso)
    const ms = end.getTime() - start.getTime()
    return Math.ceil(ms / (24 * 3600 * 1000))
  }

  // Component: Sidebar rental card
  function RentalSidebarCard({ rental, isSelected, onClick }) {
    const cameraName = rental?.cameras?.name || "Camera"
    const cameraImage = rental?.cameras?.image_url || ""
    const [imgBroken, setImgBroken] = useState(false)
    // Always use the initial payment record for payment status
    const initialPayment = rental.payments?.find(payment => payment.payment_type === 'rental' && !payment.extension_id);
    const paymentStatus = initialPayment?.payment_status;
    const isPaymentPending = rental.rental_status === "confirmed" && (
      paymentStatus === "pending" || paymentStatus === "submitted" || paymentStatus === "rejected" || !paymentStatus
    );

    const days = useMemo(() => {
      const start = new Date(rental.start_date)
      const end = new Date(rental.end_date)

      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)

      end.setDate(end.getDate() + 1)

      const diff = (end - start) / (1000 * 3600 * 24)
      return isNaN(diff) ? null : Math.floor(diff)
    }, [rental.start_date, rental.end_date])

    // Payment pending card - different styling
    if (isPaymentPending) {
      return (
        <div
          className={`p-3 sm:p-4 rounded-lg border transition-all duration-150 ${
            isSelected
              ? "bg-gray-100 border-gray-400 shadow-sm ring-2 ring-gray-300"
              : "bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-gray-400"
          }`}
        >
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 opacity-60 cursor-pointer"
              onClick={onClick}
            >
              {!imgBroken && cameraImage ? (
                <img
                  src={cameraImage || "/placeholder.svg"}
                  alt={cameraName}
                  className="object-cover w-full h-full"
                  onError={() => setImgBroken(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <CameraIcon className="h-3 w-3 sm:h-5 sm:w-5" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700 truncate text-sm">{cameraName}</h3>
                <div className="flex items-center gap-1">
                  {canCancelConfirmed(rental) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCancellation(rental);
                      }}
                      className="p-1 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                      title="Cancel rental"
                    >
                      <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  )}
                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-[#052844] flex-shrink-0" />
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5 sm:space-x-2 mt-0.5 sm:mt-1">
                <span className="text-xs text-gray-500 font-mono">#{rental.id.slice(0, 8)}</span>
              </div>
              
              <div className="mt-1 sm:mt-2">
                {paymentStatus === 'submitted' ? (
                  <span className="inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                    Under Review
                  </span>
                ) : paymentStatus === 'rejected' ? (
                  <span className="inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                    Receipt Rejected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-[#052844] text-white">
                    <CreditCard className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                    Payment Required
                  </span>
                )}
              </div>
              
              <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                {formatDate(rental.start_date)} — {formatDate(rental.end_date)}
              </div>
              
              {typeof rental.total_price === "number" && (
                <div className="text-sm font-semibold text-[#052844] mt-0.5 sm:mt-1">₱ {Number(rental.total_price).toFixed(2)}</div>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Regular card for paid rentals
    return (
      <div
        onClick={onClick}
        className={`p-2 sm:p-4 rounded-lg border cursor-pointer transition-all duration-150 ${
          isSelected
            ? "bg-[#052844]/5 border-[#052844]/30 shadow-sm"
            : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
        }`}
      >
        <div className="flex items-start space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
            {!imgBroken && cameraImage ? (
              <img
                src={cameraImage || "/placeholder.svg"}
                alt={cameraName}
                className="object-cover w-full h-full"
                onError={() => setImgBroken(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <CameraIcon className="h-3 w-3 sm:h-5 sm:w-5" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 truncate text-sm">{cameraName}</h3>
              {isSelected && <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-[#052844] flex-shrink-0" />}
            </div>
            
            <div className="flex items-center space-x-1.5 sm:space-x-2 mt-0.5 sm:mt-1">
              <span className="text-xs text-gray-500 font-mono">#{rental.id.slice(0, 8)}</span>
              {days && <span className="text-xs text-gray-600">{days} days</span>}
            </div>
            
            <span
              className={`inline-block px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-xs font-medium mt-1 sm:mt-2 ${getStatusBadgeClasses(rental.rental_status)}`}
            >
              {rental.rental_status.charAt(0).toUpperCase() + rental.rental_status.slice(1)}
            </span>
            
            <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">
              {formatDate(rental.start_date)} — {formatDate(rental.end_date)}
            </div>
            
            {typeof rental.total_price === "number" && (
              <div className="text-sm font-semibold text-gray-900 mt-0.5 sm:mt-1">₱ {Number(rental.total_price).toFixed(2)}</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Component: Main rental detail view
  function RentalDetailView({ rental }) {
    const [imgBroken, setImgBroken] = useState(false)

    const days = useMemo(() => {
      if (!rental) return null;
      const start = new Date(rental.start_date)
      const end = new Date(rental.end_date)

      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)

      end.setDate(end.getDate() + 1)

      const diff = (end - start) / (1000 * 3600 * 24)
      return isNaN(diff) ? null : Math.floor(diff)
    }, [rental?.start_date, rental?.end_date])

    const countdownToEndResult = useCountdown(rental?.end_date, {
      dir: "down",
      startDate: rental?.start_date,
      endDate: rental?.end_date,
    })
    const countdownToStartResult = useCountdown(rental?.start_date, { dir: "down" })

    if (!rental) return null
    
    const cameraName = rental?.cameras?.name || "Camera"
    const cameraImage = rental?.cameras?.image_url || ""
    // Always use the initial payment record for payment status
    const initialPayment = rental.payments?.find(payment => payment.payment_type === 'rental' && !payment.extension_id);
    const paymentStatus = initialPayment?.payment_status;
    const isPaymentPending = rental.rental_status === "confirmed" && (
      paymentStatus === "pending" || paymentStatus === "submitted" || paymentStatus === "rejected" || !paymentStatus
    );

    // Payment pending view - simplified UI with call to action
    if (isPaymentPending) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Dynamic Header based on payment status */}
          <div className={`px-4 sm:px-6 py-3 sm:py-4 text-white ${
            paymentStatus === 'submitted' 
              ? 'bg-gradient-to-r from-[#052844] to-[#063a5e]'
              : paymentStatus === 'rejected'
              ? 'bg-gradient-to-r from-gray-700 to-gray-800'
              : 'bg-gradient-to-r from-[#052844] to-[#063a5e]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl font-bold flex items-center">
                  {paymentStatus === 'submitted' ? (
                    <>
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Under Review
                    </>
                  ) : paymentStatus === 'rejected' ? (
                    <>
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Payment Rejected
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Payment Required
                    </>
                  )}
                </h1>
                <div className="flex items-center space-x-2 sm:space-x-3 mt-2">
                  <span className="text-xs font-mono bg-white/20 px-2 py-1 rounded">
                    #{rental.id.slice(0, 8)}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-white/20">
                    {cameraName}
                  </span>
                </div>
              </div>
              <div className="text-right">
                {typeof rental.total_price === "number" && (
                  <div className="text-lg sm:text-2xl font-bold">₱ {Number(rental.total_price).toFixed(2)}</div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* Payment Status Message */}
            <div className={`mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg ${
              paymentStatus === 'submitted'
                ? 'bg-gray-50 border-gray-300'
                : paymentStatus === 'rejected'
                ? 'bg-gray-50 border-gray-300'
                : 'bg-gray-50 border-gray-300'
            }`}>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <AlertCircle className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 ${
                  paymentStatus === 'submitted'
                    ? 'text-[#052844]'
                    : paymentStatus === 'rejected'
                    ? 'text-gray-600'
                    : 'text-[#052844]'
                }`} />
                <div>
                  {paymentStatus === 'submitted' ? (
                    <>
                      <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Payment Under Review</h3>
                      <p className="text-gray-700 text-xs sm:text-sm mb-3">
                        Great! Your payment receipt has been uploaded and is currently being reviewed by our admin team. 
                        You'll be notified once verification is complete (usually within 24 hours).
                      </p>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">
                        No further action required at this time. Please wait for verification.
                      </p>
                    </>
                  ) : paymentStatus === 'rejected' ? (
                    <>
                      <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Payment Receipt Rejected</h3>
                      <p className="text-gray-700 text-xs sm:text-sm mb-3">
                        Your previous payment receipt was not accepted. This could be due to unclear image, 
                        incorrect amount, or other issues. Please upload a new, clear payment confirmation.
                      </p>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">
                        Please go to your cart to upload a new payment receipt.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Payment Required to Proceed</h3>
                      <p className="text-gray-700 text-xs sm:text-sm mb-3">
                        Your rental has been confirmed by the admin, but payment is required before we can start preparing your order for delivery.
                      </p>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">
                        Please use any of the payment methods below and upload your receipt.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Details - Show only if payment pending or rejected */}
            {(paymentStatus === 'pending' || paymentStatus === 'rejected' || !paymentStatus) && (
              <div className="mb-4 sm:mb-6">
                <PaymentDetails rental={rental} />
              </div>
            )}

            {/* Rental Summary - Condensed */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-600">{formatDate(rental.start_date)} — {formatDate(rental.end_date)}</span>
                </div>
                <div className="font-semibold text-gray-900">
                  ₱{Number(rental.total_price).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/user/cart')}
                className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-[#052844] hover:bg-[#063a5e] text-white font-medium rounded-lg transition-colors duration-150 text-sm sm:text-base"
              >
                {paymentStatus === 'submitted' ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Go to Your Cart
                  </>
                ) : paymentStatus === 'rejected' ? (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Go to Your Cart
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Go to Your Cart
                  </>
                )}
                <ExternalLink className="w-3 h-3 ml-2" />
              </button>
            </div>
            
            {/* Cancel Button - if applicable */}
            {canCancelConfirmed(rental) && (
              <div className="mt-4">
                <button
                  onClick={() => handleOpenCancellation(rental)}
                  className="w-full inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-150 text-sm sm:text-base"
                >
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Cancel Rental
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Regular detail view for paid rentals
    const cameraDesc = rental?.cameras?.description || ""
    const inclusions = rental?.cameras?.camera_inclusions || []
    const canConfirmDelivered = rental.shipping_status === "in_transit_to_user"
    const canConfirmSentBack = rental.shipping_status === "return_scheduled"

    const showCountdownToEnd =
      rental.rental_status === "active" &&
      (rental.shipping_status === "delivered" ||
        rental.shipping_status === "return_scheduled" ||
        !rental.shipping_status)
    const showCountdownToStart = rental.rental_status === "confirmed" && new Date(rental.start_date) > new Date()

    const countdownToEnd = showCountdownToEnd ? countdownToEndResult : null
    const countdownToStart = showCountdownToStart ? countdownToStartResult : null

    const soonEnd = showCountdownToEnd && daysUntil(rental.end_date) <= 3
    const soonStart = showCountdownToStart && daysUntil(rental.start_date) <= 2

    const steps = shippingSteps
    const currentStep = computeCurrentStep(rental)

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header Section */}
        <div className="bg-[#052844] px-4 sm:px-6 py-3 sm:py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold">{cameraName}</h1>
              <div className="flex items-center space-x-2 sm:space-x-3 mt-2">
                <span className="text-xs font-mono bg-white/20 px-2 py-1 rounded">
                  #{rental.id.slice(0, 8)}
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-white/20">
                  {rental.rental_status.charAt(0).toUpperCase() + rental.rental_status.slice(1)}
                </span>
              </div>
            </div>
            <div className="text-right">
              {typeof rental.total_price === "number" && (
                <div className="text-lg sm:text-2xl font-bold">₱ {Number(rental.total_price).toFixed(2)}</div>
              )}
              {days && (
                <div className="text-xs sm:text-sm text-gray-300">
                  ₱ {Number(rental.price_per_day).toFixed(2)}/day • {days} days
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Equipment Section */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            <div className="flex-shrink-0">
              <div className="w-full lg:w-64 h-48 lg:h-56 bg-gray-100 rounded-lg overflow-hidden">
                {!imgBroken && cameraImage ? (
                  <img
                    src={cameraImage || "/placeholder.svg"}
                    alt={cameraName}
                    className="object-cover w-full h-full"
                    onError={() => setImgBroken(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <CameraIcon className="h-12 w-12 sm:h-16 sm:w-16" />
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Equipment Details</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                  {cameraDesc || "No description available."}
                </p>
              </div>

              {inclusions && inclusions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Package Includes</h4>
                  <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 max-h-24 sm:max-h-32 overflow-y-auto">
                      {inclusions.map((inc, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-xs sm:text-sm">
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-700">
                          {inc?.inclusion_items?.name || "Item"}
                            {inc?.quantity > 1 && <span className="text-gray-500 ml-1">×{inc.quantity}</span>}
                        </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">Rental Period</h4>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Start Date</span>
                  <span className="font-medium text-gray-900">{formatDate(rental.start_date)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">End Date</span>
                  <span className="font-medium text-gray-900">{formatDate(rental.end_date)}</span>
                </div>
                  {days != null && (
                  <div className="flex justify-between text-xs sm:text-sm pt-1 sm:pt-2 border-t border-blue-200">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-semibold text-blue-700">
                      {days} day{days === 1 ? "" : "s"}
                    </span>
                  </div>
                  )}
                </div>
              </div>

            <div className="bg-green-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                <PhilippinePeso className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">Pricing Details</h4>
              </div>
              <div className="space-y-1 sm:space-y-2">
                  {days && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Daily Rate</span>
                    <span className="font-medium text-gray-900">₱ {Number(rental.price_per_day).toFixed(2)}</span>
                  </div>
                  )}
                <div className="flex justify-between text-xs sm:text-sm pt-1 sm:pt-2 border-t border-green-200">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold text-green-700">₱ {Number(rental.total_price).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Section */}
          {(showCountdownToEnd || showCountdownToStart) && (
            <div
              className={`rounded-lg p-3 sm:p-4 ${
                soonEnd || soonStart
                  ? "bg-amber-50 border border-amber-200"
                  : "bg-blue-50 border border-blue-200"
              }`}
            >
              <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                <Timer className={`h-4 w-4 sm:h-5 sm:w-5 ${soonEnd || soonStart ? "text-amber-600" : "text-blue-600"}`} />
                <h4 className={`font-medium text-sm sm:text-base ${soonEnd || soonStart ? "text-amber-900" : "text-blue-900"}`}>
                  {showCountdownToEnd ? "Time Remaining" : "Starts In"}
                </h4>
              </div>
              
              <div className={`text-lg sm:text-2xl font-bold mb-2 ${soonEnd || soonStart ? "text-amber-900" : "text-blue-900"}`}>
                {showCountdownToEnd && countdownToEnd && (
                  <span>
                    {countdownToEnd.days}d {countdownToEnd.hours}h {countdownToEnd.minutes}m
                  </span>
                )}
                {showCountdownToStart && countdownToStart && (
                  <span>
                    {countdownToStart.days}d {countdownToStart.hours}h {countdownToStart.minutes}m
                  </span>
                )}
              </div>
              
              {(soonEnd || soonStart) && (
                <p className={`text-xs ${soonEnd || soonStart ? "text-amber-700" : "text-blue-700"}`}>
                  {showCountdownToEnd && countdownToEnd && countdownToEnd.ms <= 0
                    ? "⚠️ Rental period has ended. Please return the item soon."
                    : `📅 Reminder: Please prepare for ${soonEnd ? "return" : "delivery"}.`}
                </p>
              )}
            </div>
          )}

          {/* Delivery Progress */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Delivery Progress</h4>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                {steps.map((step, idx) => {
                  const Icon = step.icon
                  const reached = idx <= currentStep
                  const isActive = idx === currentStep
                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${
                          reached
                            ? isActive
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "bg-green-500 border-green-500 text-white"
                            : "bg-white border-gray-300 text-gray-400"
                        }`}
                      >
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                      <span
                        className={`text-xs mt-1 sm:mt-2 text-center max-w-12 sm:max-w-16 leading-tight ${
                          reached ? "text-gray-900 font-medium" : "text-gray-500"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {rental.shipping_status === 'returned' ? (
            <div className="p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 sm:space-x-3">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 text-xs sm:text-sm">Return Confirmed</p>
                <p className="text-xs text-green-600">The item has been successfully returned and checked by the admin.</p>
              </div>
            </div>
          ) : rental.shipping_status === 'in_transit_to_owner' ? (
             <div className="p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-2 sm:space-x-3">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 text-xs sm:text-sm">Return Shipment Sent</p>
                <p className="text-xs text-blue-600">You have marked the item as shipped back. It's now in transit to the owner.</p>
              </div>
            </div>
          ) : rental.shipping_status === 'return_scheduled' && actionLoading[rental.id] === "confirmSentBack" ? (
            <div className="p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-2 sm:space-x-3">
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 animate-spin" />
              <div>
                <p className="font-medium text-blue-800 text-xs sm:text-sm">Processing Return Shipment</p>
                <p className="text-xs text-blue-600">Please wait while we process your return...</p>
              </div>
            </div>
          ) : null}

          {/* Rental Extension Manager - Only show for confirmed and active rentals */}
          {['confirmed', 'active'].includes(rental.rental_status) && (
            <RentalExtensionManager 
              rental={rental} 
              userId={user.id} 
              onRefresh={refresh}
            />
          )}

          {/* Action Buttons - Sticky on mobile for thumb-friendly access */}
          <div className="flex flex-wrap gap-2 sm:gap-3 sticky bottom-0 sm:static bg-white sm:bg-transparent p-3 sm:p-0 -mx-4 sm:mx-0 -mb-4 sm:mb-0 border-t sm:border-0 border-gray-200 shadow-lg sm:shadow-none z-10">
            {rental.contract_pdf_url && (
              <button
                onClick={() => viewContract(rental.id, rental.contract_pdf_url)}
                disabled={!!contractViewLoading[rental.id]}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-[#052844] text-white rounded-lg hover:bg-[#063a5e] disabled:opacity-50 text-xs sm:text-sm font-medium transition-colors duration-150"
              >
                {contractViewLoading[rental.id] ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                <span>View Contract</span>
              </button>
            )}
            {canConfirmDelivered && (
              <button
                onClick={() => handleConfirmDelivered(rental.id)}
                disabled={actionLoading[rental.id] === "confirmDelivered"}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm font-medium transition-colors duration-150"
              >
                {actionLoading[rental.id] === "confirmDelivered" ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                <span>Confirm Received</span>
              </button>
            )}
            {canConfirmSentBack && (
              <button
                onClick={() => handleConfirmSentBack(rental.id)}
                disabled={actionLoading[rental.id] === "confirmSentBack"}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-xs sm:text-sm font-medium transition-colors duration-150"
              >
                {actionLoading[rental.id] === "confirmSentBack" ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Confirm Shipped Back</span>
                  </>
                )}
              </button>
            )}
            
            {/* Feedback Button */}
            {(rental.rental_status === "completed" || rental.rental_status === "active") && !feedbackSubmitted[rental.id] && (
              <button
                onClick={() => setShowFeedbackForm(true)}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-[#052844] text-white rounded-lg hover:bg-[#063a5e] text-xs sm:text-sm font-medium transition-colors duration-150"
              >
                <span>Give Feedback</span>
              </button>
            )}

            {feedbackSubmitted[rental.id] && (
              <div className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-green-100 text-green-800 rounded-md text-xs sm:text-sm font-medium">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Feedback Submitted</span>
              </div>
            )}
          </div>

          {/* Feedback Form Modal */}
          <AnimatePresence>
            {showFeedbackForm && (
              <div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
                onClick={() => setShowFeedbackForm(false)}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <FeedbackForm
                    rentalId={selectedRental.id}
                    userId={user.id}
                    onSuccess={handleFeedbackSubmit}
                    onSkip={() => setShowFeedbackForm(false)}
                  />
                </div>
              </div>
            )}
          </AnimatePresence>

          {contractViewError[rental.id] && (
            <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs sm:text-sm text-red-600">{contractViewError[rental.id]}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Rental Selection: Handle rental selection logic
  useEffect(() => {
    if (displayedRentals.length > 0 && !selectedRental) {
      setSelectedRental(displayedRentals[0])
    } else if (displayedRentals.length > 0 && selectedRental) {
      const stillExists = displayedRentals.find((r) => r.id === selectedRental.id)
      if (!stillExists) setSelectedRental(displayedRentals[0])
    } else if (displayedRentals.length === 0) {
      setSelectedRental(null)
    }
  }, [displayedRentals, selectedRental])

  // Loading State: Show loading indicator
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-48 sm:h-64">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 animate-spin" />
            <span className="text-gray-600 text-sm sm:text-base">Loading your rentals...</span>
          </div>
        </div>
      </div>
    )
  }

  // Main Render: Main component UI
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        {/* Filter Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="flex rounded-lg border border-gray-200 bg-white p-1 overflow-x-auto">
            {[
              { key: "payment_pending", label: "Payment Required", shortLabel: "Payment" },
              { key: "awaiting", label: "Awaiting Delivery", shortLabel: "Awaiting" },
              { key: "active", label: "Active", shortLabel: "Active" },
              { key: "returning", label: "Returning", shortLabel: "Returning" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-150 whitespace-nowrap ${
                  activeFilter === f.key
                    ? "bg-[#052844] text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {f.key === "payment_pending" && <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 inline" />}
                <span className="sm:hidden">{f.shortLabel}</span>
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 font-medium text-sm sm:text-base">Something went wrong</p>
                <p className="text-red-600 text-xs sm:text-sm mt-1">{error}</p>
                <button onClick={refresh} className="mt-2 text-xs sm:text-sm text-red-700 underline hover:no-underline">
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {displayedRentals.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 lg:p-12 text-center">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
              activeFilter === "payment_pending" ? "bg-amber-100" : "bg-gray-100"
            }`}>
              {activeFilter === "payment_pending" ? (
                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" />
              ) : (
                <CameraIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {activeFilter === "payment_pending" 
                ? "No payment required" 
                : activeFilter === "awaiting"
                ? "No rentals awaiting delivery"
                : activeFilter === "active"
                ? "No active rentals"
                : "No returning rentals"
              }
            </h3>
            <p className="text-gray-600 text-sm sm:text-base">
              {activeFilter === "payment_pending" 
                ? "All your confirmed rentals have been paid for. Check other tabs for your rentals." 
                : activeFilter === "awaiting"
                ? "Once your payment is verified, rentals will appear here when they're being prepared for delivery."
                : activeFilter === "active"
                ? "Active rentals will show here when they're delivered and in use."
                : "Rentals being returned will appear here."
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
            {/* Sidebar */}
            <div className="xl:col-span-1">
              <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Your Rentals</h3>
              <div className="space-y-2 sm:space-y-3 max-h-[200px] sm:max-h-[400px] xl:max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {displayedRentals.map((rental) => (
                  <RentalSidebarCard
                    key={rental.id}
                    rental={rental}
                    isSelected={selectedRental?.id === rental.id}
                    onClick={() => setSelectedRental(rental)}
                  />
                ))}
              </div>
            </div>

            {/* Detail View */}
            <div className="xl:col-span-3">
              <RentalDetailView rental={selectedRental} />
            </div>
          </div>
        )}

        {/* Cancellation Modal */}
        {showCancellationModal && rentalToCancel && (
          <CancellationModal
            isOpen={showCancellationModal}
            onClose={() => {
              setShowCancellationModal(false);
              setRentalToCancel(null);
            }}
            onConfirm={handleCancelConfirmedRental}
            rental={rentalToCancel}
          />
        )}

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
      </div>
    </div>
  )
}