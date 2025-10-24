// Rentals.jsx
import { useState, useEffect, useRef } from "react";
import useRentalStore from "../../stores/rentalStore";
import { subscribeToAllRentals, unsubscribeFromChannel } from "../../services/realtimeService";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react";
import {
  adminConfirmApplication,
  adminRejectApplication,
  adminStartRental,
  adminCompleteRental,
  adminCancelRental,
  adminForceDeleteRental,
  adminRemoveCancelledRental,
  adminConfirmApplicationWithConflictCheck,
  transferRentalToUnit,
  getAvailableUnitsOfModel,
} from "../../services/rentalService";
import { adminVerifyRentalPayment, userUpdatePaymentStatus, getPaymentReceiptUrl } from "../../services/paymentService";
import ConflictResolutionModal from "../../components/modals/ConflictResolutionModal";
import { PaymentVerificationModal, PaymentStatusBadge } from "../../components/payment/PaymentVerificationComponents";
import {
  adminConfirmReceived,
  adminConfirmReturned,
} from "../../services/bookingService";
import { getSignedContractUrl } from "../../services/pdfService";
import RentalStepper from "../../components/rental/RentalStepper";
import { getUserById } from "../../services/userService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Rentals() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { allRentals, loadAllRentals, loading } = useRentalStore();
  const [rentals, setRentals] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [contractViewLoading, setContractViewLoading] = useState({});
  const [contractViewError, setContractViewError] = useState({});
  const [selectedStatus, setSelectedStatus] = useState(() => {
    return searchParams.get("status") || "needs_action";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return searchParams.get("month") || "";
  });
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const cardRefs = useRef({});
  
  // Conflict resolution state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  // Payment verification state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentRental, setSelectedPaymentRental] = useState(null);

  useEffect(() => {
    loadAllRentals();
    const channel = subscribeToAllRentals();
    return () => {
      unsubscribeFromChannel(channel);
    };
  }, [loadAllRentals]);

  useEffect(() => {
    const rentalIdFromParams = searchParams.get("highlightId");
    if (rentalIdFromParams && allRentals.length > 0) {
      const targetRental = allRentals.find(
        (r) => String(r.id) === String(rentalIdFromParams)
      );
      if (!targetRental) {
        console.warn(
          `Rental ID ${rentalIdFromParams} not found in the full rental list.`
        );
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("highlightId");
        setSearchParams(newParams);
        return;
      }
      const isPresent = rentals.some(
        (r) => String(r.id) === String(rentalIdFromParams)
      );
      if (isPresent) {
        setHighlightId(rentalIdFromParams);
        setTimeout(() => {
          const cardElement = cardRefs.current[String(rentalIdFromParams)];
          if (cardElement) {
            cardElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
          setTimeout(() => {
            setHighlightId(null);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("highlightId");
            setSearchParams(newParams);
          }, 3000);
        }, 100);
      } else {
        setHighlightId(rentalIdFromParams);
      }
    } else if (!rentalIdFromParams) {
      setHighlightId(null);
    }
  }, [searchParams, allRentals, rentals, setSearchParams]);

  const needsAdminAction = (rental) => {
    return (
      rental.rental_status === "pending" ||
      (rental.rental_status === "confirmed" &&
        rental.shipping_status === "in_transit_to_owner")
    );
  };

  const doesRentalOverlapMonth = (rental, monthString) => {
    if (!monthString) return true; // No month filter, show all
    
    const rentalStart = new Date(rental.start_date);
    const rentalEnd = new Date(rental.end_date);
    const [year, month] = monthString.split('-').map(Number);
    const filterMonthStart = new Date(year, month - 1, 1); // month is 0-indexed
    const filterMonthEnd = new Date(year, month, 0); // Last day of the month
    
    // Check if rental overlaps with the selected month
    return rentalStart <= filterMonthEnd && rentalEnd >= filterMonthStart;
  };

  const handleViewDetails = async (rental) => {
    setSelectedRental(rental);
    try {
      const userData = await getUserById(rental.user_id);
      setSelectedUser(userData);
    } catch {
      toast.error("Failed to load user details");
      setSelectedUser(null);
    }
  };

  useEffect(() => {
    console.log("Rental filter effect running with:", {
      selectedStatus,
      searchTerm,
      selectedMonth,
      allRentalsCount: allRentals.length,
      highlightId: searchParams.get("highlightId"),
      currentURL: window.location.href,
      allSearchParams: Object.fromEntries(searchParams.entries())
    });
    
    let filtered = allRentals;
    const rentalIdFromParams = searchParams.get("highlightId");
    let targetRentalForHighlight = null;
    let needsOverride = false;

    if (rentalIdFromParams && allRentals.length > 0) {
      console.log(`Looking for rental with ID: ${rentalIdFromParams}`);
      targetRentalForHighlight = allRentals.find(
        (r) => String(r.id) === String(rentalIdFromParams)
      );
      
      if (targetRentalForHighlight) {
        console.log(`Found target rental:`, {
          id: targetRentalForHighlight.id,
          status: targetRentalForHighlight.rental_status,
          shipping_status: targetRentalForHighlight.shipping_status
        });
        
        // Check if the target rental would be visible with current filter
        let wouldBeVisible = true;
        let tempFiltered = allRentals;

        if (selectedStatus === "needs_action") {
          tempFiltered = tempFiltered.filter(needsAdminAction);
        } else if (selectedStatus === "payment_pending") {
          tempFiltered = tempFiltered.filter(
            (rental) => rental.rental_status === "confirmed" && rental.payment_status === "submitted"
          );
        } else {
          tempFiltered = tempFiltered.filter(
            (rental) => rental.rental_status === selectedStatus
          );
        }

        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          tempFiltered = tempFiltered.filter((rental) => {
            const fullName = `${
              rental.users?.first_name || ""
            } ${rental.users?.last_name || ""}`.toLowerCase();
            return (
              fullName.includes(searchLower) ||
              rental.users?.email?.toLowerCase().includes(searchLower) ||
              rental.cameras?.name?.toLowerCase().includes(searchLower)
            );
          });
        }

        wouldBeVisible = tempFiltered.some(
          (r) => String(r.id) === String(rentalIdFromParams)
        );
        
        console.log(`Rental would be visible with current filter (${selectedStatus}):`, wouldBeVisible);
        
        // If the target rental wouldn't be visible, automatically switch to the correct status
        if (!wouldBeVisible) {
          const targetStatus = targetRentalForHighlight.rental_status;
          console.log(`Target rental ${rentalIdFromParams} has status '${targetStatus}' but current filter is '${selectedStatus}'. Switching to correct status.`);
          
          // Determine the correct filter status
          let correctStatus = targetStatus;
          if (needsAdminAction(targetRentalForHighlight)) {
            correctStatus = "needs_action";
            console.log("Rental needs admin action, switching to 'needs_action'");
          } else {
            console.log(`Rental doesn't need admin action, switching to '${targetStatus}'`);
          }
          
          // Only switch if it's different from current status
          if (correctStatus !== selectedStatus) {
            console.log(`Switching from '${selectedStatus}' to '${correctStatus}'`);
            setSelectedStatus(correctStatus);
            // Update URL to reflect the new status
            const newParams = new URLSearchParams(searchParams);
            newParams.set("status", correctStatus);
            setSearchParams(newParams, { replace: true });
            return; // Exit early, let the effect re-run with new status
          } else {
            console.log("Correct status is same as current status, using override");
            needsOverride = true;
          }
        } else {
          console.log("Rental is already visible with current filter");
        }
      } else {
        console.log(`Rental with ID ${rentalIdFromParams} not found in allRentals`);
      }
    }

    if (needsOverride && targetRentalForHighlight) {
      if (selectedStatus === "needs_action") {
        filtered = filtered.filter(needsAdminAction);
      } else {
        filtered = filtered.filter(
          (rental) => rental.rental_status === selectedStatus
        );
      }

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter((rental) => {
          const fullName = `${
            rental.users?.first_name || ""
          } ${rental.users?.last_name || ""}`.toLowerCase();
          return (
            fullName.includes(searchLower) ||
            rental.users?.email?.toLowerCase().includes(searchLower) ||
            rental.cameras?.name?.toLowerCase().includes(searchLower)
          );
        });
      }

      // Apply month filter
      if (selectedMonth) {
        filtered = filtered.filter((rental) => 
          doesRentalOverlapMonth(rental, selectedMonth)
        );
      }

      if (
        !filtered.some(
          (r) => String(r.id) === String(targetRentalForHighlight.id)
        )
      ) {
        const rentalToAdd = allRentals.find(
          (r) => String(r.id) === String(targetRentalForHighlight.id)
        );
        if (rentalToAdd) {
          filtered = [rentalToAdd, ...filtered];
        }
      }
    } else {
      if (selectedStatus === "needs_action") {
        filtered = filtered.filter(needsAdminAction);
      } else if (selectedStatus === "payment_pending") {
        filtered = filtered.filter(
          (rental) => rental.rental_status === "confirmed" && rental.payment_status === "submitted"
        );
      } else {
        filtered = filtered.filter(
          (rental) => rental.rental_status === selectedStatus
        );
      }

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter((rental) => {
          const fullName = `${
            rental.users?.first_name || ""
          } ${rental.users?.last_name || ""}`.toLowerCase();
          return (
            fullName.includes(searchLower) ||
            rental.users?.email?.toLowerCase().includes(searchLower) ||
            rental.cameras?.name?.toLowerCase().includes(searchLower)
          );
        });
      }

      // Apply month filter
      if (selectedMonth) {
        filtered = filtered.filter((rental) => 
          doesRentalOverlapMonth(rental, selectedMonth)
        );
      }
    }

    setRentals(filtered);

    if (
      needsOverride &&
      targetRentalForHighlight &&
      highlightId !== rentalIdFromParams
    ) {
      setHighlightId(rentalIdFromParams);
    }
  }, [selectedStatus, searchTerm, selectedMonth, allRentals, searchParams, highlightId]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Pending Review";
      case "confirmed":
        return "Confirmed";
      case "active":
        return "Active Rental";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "rejected":
        return "Rejected";
      default:
        return status || "Unknown";
    }
  };

  const getShippingBadgeClasses = (status) => {
    switch (status) {
      case "ready_to_ship":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "in_transit_to_user":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "return_scheduled":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "in_transit_to_owner":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "returned":
        return "bg-teal-100 text-teal-800 border-teal-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const prettyShippingStatus = (status) => {
    if (!status) return "No Status";
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

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
  ];

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
  };

  // Inclusive day count between two date strings (counts both start and end dates)
  function inclusiveDays(startDateString, endDateString) {
    if (!startDateString || !endDateString) return 0;
    const s = new Date(startDateString);
    const e = new Date(endDateString);
    if (isNaN(s) || isNaN(e)) return 0;
    const utcStart = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
    const utcEnd = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
    const diff = Math.floor((utcEnd - utcStart) / (24 * 60 * 60 * 1000));
    return diff >= 0 ? diff + 1 : 0;
  }

  function computeNowKey(r) {
    const rentalStatus = r?.rental_status;
    const shippingStatus = r?.shipping_status;

    if (rentalStatus === "completed" || shippingStatus === "returned")
      return "completed";
    if (shippingStatus === "in_transit_to_owner")
      return "in_transit_to_owner";
    if (shippingStatus === "return_scheduled") return "return_scheduled";
    if (rentalStatus === "active") return "active";
    if (shippingStatus === "delivered") return "delivered";
    if (shippingStatus === "in_transit_to_user") return "in_transit_to_user";
    if (shippingStatus === "ready_to_ship") return "ready_to_ship";
    if (rentalStatus === "confirmed") return "confirmed";
    return "pending";
  }

  function getNowNextLabels(r) {
    const nowKey = computeNowKey(r);
    const idx = Math.max(0, STEP_ORDER.indexOf(nowKey));
    const now = STEP_LABELS[STEP_ORDER[idx]];
    const next = STEP_LABELS[STEP_ORDER[idx + 1]];
    return { now, next };
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleApprove = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "approve" }));
    let originalRentalStatus = null;
    const rentalToApprove = allRentals.find((r) => r.id === rentalId);
    if (rentalToApprove) {
      originalRentalStatus = rentalToApprove.rental_status;
    }
    try {
      // Use enhanced conflict detection
      const result = await adminConfirmApplicationWithConflictCheck(rentalId);
      
      if (result.error) {
        toast.error(`Failed to approve rental: ${result.error}`);
        return;
      }

      if (result.hasConflicts) {
        // Show conflict resolution modal
        setConflictData({
          rental: result.rental,
          conflicts: result.conflicts,
          availableUnits: result.availableUnits
        });
        setShowConflictModal(true);
        return;
      }

      // No conflicts, normal approval
      if (result.success) {
        toast.success("Rental approved successfully!");
        await loadAllRentals(); // Refresh data
        if (originalRentalStatus === "pending") {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("status", "confirmed");
          newParams.set("highlightId", rentalId);
          setSearchParams(newParams);
          setSelectedStatus("confirmed");
        }
      }
    } catch {
      console.error("Error approving rental:", error);
      toast.error("Failed to approve rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleReject = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "reject" }));
    try {
      const result = await adminRejectApplication(rentalId);
      if (result.error) {
        toast.error(`Failed to reject rental: ${result.error}`);
        return;
      }
      toast.success("Rental rejected successfully!");
    } catch {
      toast.error("Failed to reject rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleStartRental = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "start" }));
    try {
      const result = await adminStartRental(rentalId);
      if (result.error) {
        toast.error(`Failed to start rental: ${result.error}`);
        return;
      }
      toast.success("Rental activated successfully!");
    } catch {
      toast.error("Failed to start rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleCompleteRental = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "complete" }));
    try {
      const result = await adminCompleteRental(rentalId);
      if (result.error) {
        toast.error(`Failed to complete rental: ${result.error}`);
        return;
      }
      toast.success("Rental completed successfully!");
    } catch {
      toast.error("Failed to complete rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleCancelRental = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "cancel" }));
    try {
      const result = await adminCancelRental(rentalId);
      if (result.error) {
        toast.error(`Failed to cancel rental: ${result.error}`);
        return;
      }
      toast.success("Rental cancelled successfully!");
    } catch {
      toast.error("Failed to cancel rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleDeleteRental = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "delete" }));
    try {
      const result = await adminForceDeleteRental(rentalId);
      if (result.error) {
        toast.error(`Failed to delete rental: ${result.error}`);
        return;
      }
      toast.success("Rental deleted successfully!");
      setShowDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const handleRemoveCancelledRental = async (rentalId) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: "remove" }));
    try {
      const result = await adminRemoveCancelledRental(rentalId);
      if (result.error) {
        toast.error(`Failed to remove cancelled rental: ${result.error}`);
        return;
      }
      toast.success("Cancelled rental removed successfully!");
    } catch {
      toast.error("Failed to remove cancelled rental");
    } finally {
      setActionLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  // Conflict resolution handlers
  const handleConfirmWithCurrentUnit = async (rentalId) => {
    setConflictLoading(true);
    try {
      const result = await adminConfirmApplication(rentalId);
      if (result.error) {
        toast.error(`Failed to confirm rental: ${result.error}`);
        return;
      }
      toast.success("Rental confirmed with current unit (conflicts remain)!");
      setShowConflictModal(false);
      setConflictData(null);
      await loadAllRentals(); // Refresh data
    } catch {
      console.error("Error confirming with current unit:", error);
      toast.error("Failed to confirm rental");
    } finally {
      setConflictLoading(false);
    }
  };

  const handleTransferToUnit = async (rentalId, newUnitId) => {
    setConflictLoading(true);
    try {
      const transferResult = await transferRentalToUnit(rentalId, newUnitId);
      if (transferResult.error) {
        toast.error(`Failed to transfer rental: ${transferResult.error}`);
        return;
      }

      const confirmResult = await adminConfirmApplication(rentalId);
      if (confirmResult.error) {
        toast.error(`Failed to confirm rental after transfer: ${confirmResult.error}`);
        return;
      }

      toast.success(transferResult.message + " and confirmed!");
      setShowConflictModal(false);
      setConflictData(null);
      await loadAllRentals(); // Refresh data
    } catch {
      console.error("Error transferring rental:", error);
      toast.error("Failed to transfer rental");
    } finally {
      setConflictLoading(false);
    }
  };

  const handleRejectConflicts = async (conflictIds, rejectionReason) => {
    setConflictLoading(true);
    try {
      // Reject all specified bookings
      const rejectPromises = conflictIds.map(id => adminRejectApplication(id, rejectionReason));
      const rejectResults = await Promise.all(rejectPromises);
      
      const failedRejections = rejectResults.filter(result => result.error);
      if (failedRejections.length > 0) {
        toast.error(`Failed to reject ${failedRejections.length} booking(s)`);
        return;
      }

      // Check if we're rejecting the current rental (the one being approved)
      const isRejectingCurrentRental = conflictIds.includes(conflictData.rental.id);
      
      if (isRejectingCurrentRental) {
        // We rejected the current rental, so don't try to confirm it
        toast.success("Rental application rejected successfully!");
      } else {
        // We rejected other conflicting rentals, now confirm the current one
        const confirmResult = await adminConfirmApplication(conflictData.rental.id);
        if (confirmResult.error) {
          toast.error(`Failed to confirm rental: ${confirmResult.error}`);
          return;
        }
        toast.success(`Rejected ${conflictIds.length} conflicting booking(s) and confirmed the new rental!`);
      }

      setShowConflictModal(false);
      setConflictData(null);
      await loadAllRentals(); // Refresh data
    } catch {
      console.error("Error rejecting conflicts:", error);
      toast.error("Failed to reject conflicting bookings");
    } finally {
      setConflictLoading(false);
    }
  };

  // Payment verification handlers
  const handleOpenPaymentVerification = (rental) => {
    // Find the initial rental payment (payment_type = 'rental' and extension_id is null)
    const initialPayment = rental.payments?.find(payment => 
      payment.payment_type === 'rental' && !payment.extension_id
    );
    
    if (!initialPayment) {
      toast.error("No payment record found for this rental");
      return;
    }
    
    // Create an enhanced rental object with the specific payment info
    const rentalWithPayment = {
      ...rental,
      selectedPayment: initialPayment,
      payment_status: initialPayment.payment_status,
      payment_receipt_url: initialPayment.payment_receipt_url
    };
    
    setSelectedPaymentRental(rentalWithPayment);
    setShowPaymentModal(true);
  };

  const handleVerifyPayment = async (paymentId) => { 
    try {
      const result = await adminVerifyRentalPayment(paymentId);
      if (result.success) {
        toast.success("Payment verified successfully!");
        await loadAllRentals(); 
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(`Failed to verify payment: ${error.message}`);
      throw error;
    }
  };

  const handleRejectPayment = async (paymentId, reason) => {
    try {
      const result = await userUpdatePaymentStatus(paymentId, 'rejected');
      if (result.success) {
        await loadAllRentals();
        toast.success("Payment rejected.");
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(`Failed to reject payment: ${error.message}`);
      throw error;
    }
  };

  const viewContract = async (rentalId, contractFilePath) => {
    if (!contractFilePath) {
      setContractViewError((prev) => ({
        ...prev,
        [rentalId]: "Contract file path is missing.",
      }));
      toast.warn("Contract file path is missing");
      return;
    }
    setContractViewLoading((prev) => ({ ...prev, [rentalId]: true }));
    setContractViewError((prev) => {
      const newErrors = { ...prev };
      delete newErrors[rentalId];
      return newErrors;
    });
    try {
      const signedUrl = await getSignedContractUrl(contractFilePath);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
      toast.success("Opening contract in new tab");
    } catch (err) {
      toast.error("Could not generate link to view contract");
      setContractViewError((prev) => ({
        ...prev,
        [rentalId]: err.message || "Could not generate link to view contract.",
      }));
    } finally {
      setContractViewLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[rentalId];
        return newLoading;
      });
    }
  };

  const viewPaymentReceipt = async (paymentId) => {
    if (!paymentId) {
      toast.warn("Payment ID is missing");
      return;
    }

    try {
      const result = await getPaymentReceiptUrl(paymentId);
      if (result.success && result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
        toast.success("Opening payment receipt in new tab");
      } else {
        toast.error(result.error || "No payment receipt found");
      }
    } catch (error) {
      console.error("Error viewing payment receipt:", error);
      toast.error("Could not open payment receipt");
    }
  };

  const RentalCard = ({ rental }) => {
    const cardRef = (el) => {
      cardRefs.current[String(rental.id)] = el;
    };
    const isTemporaryBooking = rental.booking_type === "temporary";
    const customerName =
      rental.customer_name ||
      (rental.users
        ? `${rental.users.first_name} ${rental.users.last_name}`.trim()
        : "") ||
      "Unknown Customer";
    const customerEmail = rental.customer_email || rental.users?.email || "No email";

    return (
      <div
        ref={cardRef}
        className={`bg-gray-800 rounded-lg border-2 transition-all duration-200 hover:shadow-lg
          ${
            String(highlightId) === String(rental.id)
              ? "border-blue-500 shadow-lg ring-2 ring-blue-900/50"
              : "border-gray-700 hover:border-gray-600"
          }
          ${isTemporaryBooking ? "ring-1 ring-orange-600/30" : ""}`}
      >
        <div className="p-3 sm:p-4">
          {isTemporaryBooking && (
            <div className="mb-2 px-2 py-1.5 bg-orange-900/20 border border-orange-700 rounded-md">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                <span className="text-orange-200 text-xs font-medium">
                  Admin Managed (Instagram)
                </span>
              </div>
            </div>
          )}
          
          {/* Header - Compact */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-1 truncate">
                {rental.cameras?.name || "Camera Equipment"}
                {rental.cameras?.serial_number && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    #{rental.cameras.serial_number}
                  </span>
                )}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-300">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                  <span className="truncate">{customerName}</span>
                </div>
                <span className="hidden sm:inline text-gray-500">•</span>
                <span className="truncate">{customerEmail}</span>
                {rental.customer_contact && (
                  <>
                    <span className="hidden sm:inline text-gray-500">•</span>
                    <span className="truncate">{rental.customer_contact}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex flex-row sm:flex-col items-start sm:items-end gap-1.5 flex-shrink-0">
              <span
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium border ${getStatusColor(
                  rental.rental_status
                )}`}
              >
                {getStatusText(rental.rental_status)}
              </span>
              {rental.rental_status === "confirmed" && (() => {
                const initialPayment = rental.payments?.find(payment => 
                  payment.payment_type === 'rental' && !payment.extension_id
                );
                const rentalWithPaymentStatus = {
                  ...rental,
                  payment_status: initialPayment?.payment_status,
                  selectedPayment: initialPayment
                };
                return (
                  <PaymentStatusBadge 
                    rental={rentalWithPaymentStatus} 
                    onOpenVerification={() => handleOpenPaymentVerification(rental)}
                  />
                );
              })()}
            </div>
          </div>
          
          {/* Stats Grid - More Compact */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-md">
              <DollarSign className="h-4 w-4 text-green-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  ₱{rental.total_price?.toFixed(2) || "0.00"}
                </p>
                <p className="text-[10px] text-gray-400">Total</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-md">
              <Clock className="h-4 w-4 text-orange-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {inclusiveDays(rental.start_date, rental.end_date)} days
                </p>
                <p className="text-[10px] text-gray-400">Duration</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-md">
              <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">
                  {formatDate(rental.start_date)}
                </p>
                <p className="text-[10px] text-gray-400">Start</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-md">
              <Calendar className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">
                  {formatDate(rental.end_date)}
                </p>
                <p className="text-[10px] text-gray-400">End</p>
              </div>
            </div>
          </div>
          
          {/* Actions - Compact Grid */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">{rental.rental_status === "pending" && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprove(rental.id);
                  }}
                  disabled={actionLoading[rental.id] === "approve"}
                  className="inline-flex items-center gap-1 sm:gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading[rental.id] === "approve" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  <span>Approve</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReject(rental.id);
                  }}
                  disabled={actionLoading[rental.id] === "reject"}
                  className="inline-flex items-center gap-1 sm:gap-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading[rental.id] === "reject" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  <span>Reject</span>
                </button>
              </>
            )}
            {(rental.rental_status === "confirmed" ||
              rental.rental_status === "active") && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/delivery?rentalId=${rental.id}`);
                  }}
                  className="inline-flex items-center gap-1 sm:gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors"
                >
                  <Truck className="h-3 w-3" />
                  <span className="hidden xs:inline">Manage </span>
                  <span>Logistics</span>
                </button>
                {rental.rental_status !== "active" &&
                  rental.shipping_status === "delivered" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRental(rental.id);
                      }}
                      disabled={actionLoading[rental.id] === "start"}
                      className="inline-flex items-center gap-1 sm:gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading[rental.id] === "start" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      <span>Activate</span>
                    </button>
                  )}
              </>
            )}
            
            {/* Admin Proxy Actions for Temporary Bookings */}
            {isTemporaryBooking && (
              <>
                {rental.rental_status === "confirmed" && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setActionLoading((prev) => ({
                        ...prev,
                        [rental.id]: "received",
                      }));
                      try {
                        const result = await adminConfirmReceived(rental.id);
                        if (result.success) {
                          toast.success("Customer receipt confirmed!");
                        } else {
                          toast.error(
                            `Failed to confirm receipt: ${result.error}`
                          );
                        }
                      } catch {
                        toast.error("Failed to confirm receipt");
                      } finally {
                        setActionLoading((prev) => {
                          const newLoading = { ...prev };
                          delete newLoading[rental.id];
                          return newLoading;
                        });
                      }
                    }}
                    disabled={actionLoading[rental.id] === "received"}
                    className="inline-flex items-center gap-1 sm:gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading[rental.id] === "received" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    <span className="hidden xs:inline">Customer </span>
                    <span>Received</span>
                  </button>
                )}
                {rental.rental_status === "active" && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setActionLoading((prev) => ({
                        ...prev,
                        [rental.id]: "returned",
                      }));
                      try {
                        const result = await adminConfirmReturned(rental.id);
                        if (result.success) {
                          toast.success("Customer return confirmed!");
                        } else {
                          toast.error(
                            `Failed to confirm return: ${result.error}`
                          );
                        }
                      } catch {
                        toast.error("Failed to confirm return");
                      } finally {
                        setActionLoading((prev) => {
                          const newLoading = { ...prev };
                          delete newLoading[rental.id];
                          return newLoading;
                        });
                      }
                    }}
                    disabled={actionLoading[rental.id] === "returned"}
                    className="inline-flex items-center gap-1 sm:gap-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading[rental.id] === "returned" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Truck className="h-3 w-3" />
                    )}
                    <span className="hidden xs:inline">Customer </span>
                    <span>Returned</span>
                  </button>
                )}
                {(rental.rental_status === "confirmed" ||
                  rental.rental_status === "active") && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setActionLoading((prev) => ({
                        ...prev,
                        [rental.id]: "delivered",
                      }));
                      try {
                        const result = await adminMarkDelivered(rental.id);
                        if (result.success) {
                          toast.success("Marked as delivered!");
                        } else {
                          toast.error(
                            `Failed to mark as delivered: ${result.error}`
                          );
                        }
                      } catch {
                        toast.error("Failed to mark as delivered");
                      } finally {
                        setActionLoading((prev) => {
                          const newLoading = { ...prev };
                          delete newLoading[rental.id];
                          return newLoading;
                        });
                      }
                    }}
                    disabled={actionLoading[rental.id] === "delivered"}
                    className="inline-flex items-center gap-1 sm:gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading[rental.id] === "delivered" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Truck className="h-3 w-3" />
                    )}
                    <span>Mark Delivered</span>
                  </button>
                )}
              </>
            )}
            
            {rental.contract_pdf_url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  viewContract(rental.id, rental.contract_pdf_url);
                }}
                disabled={contractViewLoading[rental.id]}
                className="inline-flex items-center gap-1 sm:gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              >
                {contractViewLoading[rental.id] ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <FileText className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">View </span>
                <span>Contract</span>
              </button>
            )}
            
            {/* View Receipt button */}
            {rental.rental_status === "confirmed" && (() => {
              const initialPayment = rental.payments?.find(payment => 
                payment.payment_type === 'rental' && !payment.extension_id
              );
              return initialPayment?.payment_receipt_url ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    viewPaymentReceipt(initialPayment.id);
                  }}
                  className="inline-flex items-center gap-1 sm:gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors"
                >
                  <Receipt className="h-3 w-3" />
                  <span className="hidden sm:inline">View </span>
                  <span>Receipt</span>
                </button>
              ) : null;
            })()}
            
            {/* Transfer button */}
            {rental.rental_status === "pending" && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  setConflictLoading(true);
                  try {
                    const { data: availableUnits } = await getAvailableUnitsOfModel(
                      rental.cameras?.name,
                      rental.start_date,
                      rental.end_date,
                      rental.id
                    );

                    if (!availableUnits || availableUnits.length === 0) {
                      toast.error("No available units of the same model found for transfer.");
                      return;
                    }

                    setConflictData({
                      rental: rental,
                      conflicts: [],
                      availableUnits: availableUnits
                    });
                    setShowConflictModal(true);
                  } catch (error) {
                    console.error("Error checking available units:", error);
                    toast.error("Failed to check available units for transfer.");
                  } finally {
                    setConflictLoading(false);
                  }
                }}
                disabled={conflictLoading}
                className="inline-flex items-center gap-1 sm:gap-1.5 bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              >
                {conflictLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Truck className="h-3 w-3" />
                )}
                <span>Transfer</span>
              </button>
            )}
            
            {/* Remove button for cancelled rentals */}
            {rental.rental_status === "cancelled" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to remove this cancelled rental? This will free up the dates and permanently delete the record.')) {
                    handleRemoveCancelledRental(rental.id);
                  }
                }}
                disabled={actionLoading[rental.id] === "remove"}
                className="inline-flex items-center gap-1 sm:gap-1.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === "remove" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                <span className="hidden xs:inline">Remove & </span>
                <span>Free Dates</span>
              </button>
            )}
            
            <button
              onClick={() => handleViewDetails(rental)}
              className="inline-flex items-center gap-1 sm:gap-1.5 text-gray-300 hover:text-white active:text-gray-100 text-xs font-medium transition-colors"
            >
              <Eye className="h-3 w-3" />
              <span className="hidden xs:inline">View </span>
              <span>Details</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(rental.id);
              }}
              disabled={actionLoading[rental.id] === "delete"}
              className="inline-flex items-center gap-1 sm:gap-1.5 text-red-400 hover:text-red-300 active:text-red-200 text-xs font-medium ml-auto transition-colors"
            >
              {actionLoading[rental.id] === "delete" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              <span>Delete</span>
            </button>
          </div>
          
          {/* Error Messages - Compact */}
          {contractViewError[rental.id] && (
            <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded-md">
              <p className="text-red-300 text-xs">
                {contractViewError[rental.id]}
              </p>
            </div>
          )}
          
          {/* Cancellation Reason - Compact */}
          {rental.rental_status === "cancelled" && rental.cancellation_reason && (
            <div className="mt-2 p-2 bg-orange-900/20 border border-orange-700 rounded-md">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-orange-200 text-xs font-medium mb-0.5">
                    Cancellation Reason
                  </p>
                  <p className="text-orange-300 text-xs leading-relaxed">
                    {rental.cancellation_reason}
                  </p>
                  {rental.cancelled_by && (
                    <p className="text-orange-400 text-[10px] mt-1">
                      By: {rental.cancelled_by === 'user' ? 'Customer' : 'Admin'}
                      {rental.cancelled_at && ` on ${formatDate(rental.cancelled_at)}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const statusFilters = [
    {
      key: "needs_action",
      label: "Needs Action",
      count: allRentals
        .filter((r) => !selectedMonth || doesRentalOverlapMonth(r, selectedMonth))
        .filter((r) => needsAdminAction(r)).length,
    },
    {
      key: "pending",
      label: "Pending",
      count: allRentals
        .filter((r) => !selectedMonth || doesRentalOverlapMonth(r, selectedMonth))
        .filter((r) => r.rental_status === "pending").length,
    },
    {
      key: "confirmed",
      label: "Confirmed",
      count: allRentals
        .filter((r) => !selectedMonth || doesRentalOverlapMonth(r, selectedMonth))
        .filter((r) => r.rental_status === "confirmed").length,
    },
    {
      key: "payment_pending",
      label: "Payment Pending",
      count: allRentals
        .filter((r) => !selectedMonth || doesRentalOverlapMonth(r, selectedMonth))
        .filter((r) => r.rental_status === "confirmed" && r.payment_status === "submitted").length,
    },
    {
      key: "active",
      label: "Active",
      count: allRentals
        .filter((r) => !selectedMonth || doesRentalOverlapMonth(r, selectedMonth))
        .filter((r) => r.rental_status === "active").length,
    },
    {
      key: "completed",
      label: "Completed",
      count: allRentals
        .filter((r) => !selectedMonth || doesRentalOverlapMonth(r, selectedMonth))
        .filter((r) => r.rental_status === "completed").length,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: allRentals
        .filter((r) => !selectedMonth || doesRentalOverlapMonth(r, selectedMonth))
        .filter((r) => r.rental_status === "cancelled").length,
    },
  ];

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("status", status);
    setSearchParams(newParams);
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    const newParams = new URLSearchParams(searchParams);
    if (month) {
      newParams.set("month", month);
    } else {
      newParams.delete("month");
    }
    setSearchParams(newParams);
  };

  // Helpers to navigate months with arrow buttons
  const monthStringFromDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const handlePrevMonth = () => {
    let base;
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      base = new Date(y, m - 1, 1);
    } else {
      base = new Date();
    }
    const prev = new Date(base.getFullYear(), base.getMonth() - 1, 1);
    handleMonthChange(monthStringFromDate(prev));
  };

  const handleNextMonth = () => {
    let base;
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      base = new Date(y, m - 1, 1);
    } else {
      base = new Date();
    }
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    handleMonthChange(monthStringFromDate(next));
  };

  // Generate month options for the current and next 12 months
  const getMonthOptions = () => {
    const options = [{ value: "", label: "All Months" }];
    const currentDate = new Date();
    
    for (let i = -6; i <= 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options;
  };

  const RentalDetailModal = ({ rental, onClose }) => {
    const isTemporaryBooking = rental?.booking_type === "temporary";
    const customerName =
      rental?.customer_name ||
      (rental?.users
        ? `${rental.users.first_name} ${rental.users.last_name}`.trim()
        : "") ||
      "Unknown Customer";
    const customerEmail = rental?.customer_email || rental?.users?.email || "No email";

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Rental Details
                </h2>
                <p className="text-gray-300 mt-1">
                  {rental.cameras?.name}
                  {rental.cameras?.serial_number && (
                    <span className="ml-2 text-sm text-gray-400">
                      #{rental.cameras.serial_number}
                    </span>
                  )}
                </p>
                {isTemporaryBooking && (
                  <div className="mt-2 px-3 py-1 bg-orange-900/20 border border-orange-700 rounded-lg inline-block">
                    <span className="text-orange-200 text-sm font-medium">
                      Admin Managed (Instagram Customer)
                    </span>
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
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-200 transition-colors p-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="space-y-6">
              <RentalStepper rental={rental} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">
                    Customer Information
                  </h3>
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
                        <p className="text-xs text-gray-400 uppercase tracking-wide">
                          Phone
                        </p>
                        <p className="text-sm text-white">
                          {rental?.customer_contact ||
                            selectedUser?.contact_number ||
                            "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">
                          Address
                        </p>
                        <p className="text-sm text-white">
                          {selectedUser?.address ? (
                            <>
                              {selectedUser.address}
                              {selectedUser.city && `, ${selectedUser.city}`}
                              {selectedUser.state && `, ${selectedUser.state}`}
                              {selectedUser.postal_code &&
                                ` ${selectedUser.postal_code}`}
                            </>
                          ) : (
                            "Not provided"
                          )}
                        </p>
                      </div>
                    </div>
                    {selectedUser?.emergency_contact && (
                      <div className="pt-3 border-t border-gray-600">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                          Emergency Contact
                        </p>
                        <div className="bg-gray-600 rounded p-3">
                          <p className="text-sm text-white font-medium">
                            {selectedUser.emergency_contact.name}
                          </p>
                          <p className="text-sm text-gray-300">
                            {selectedUser.emergency_contact.phone}
                          </p>
                          <p className="text-sm text-gray-300">
                            {selectedUser.emergency_contact.relationship}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">
                    Rental & Equipment
                  </h3>
                  <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">
                          Rental Status:{" "}
                          {getStatusText(selectedRental?.rental_status)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">
                          Shipping Status:{" "}
                          {prettyShippingStatus(selectedRental?.shipping_status)}
                        </span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-600">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">
                            Equipment
                          </p>
                          <p className="text-sm font-medium text-white">
                            {selectedRental.cameras?.name || "Camera Equipment"}
                            {selectedRental.cameras?.serial_number && (
                              <span className="ml-2 text-xs text-gray-400">
                                #{selectedRental.cameras.serial_number}
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">
                            Total Price
                          </p>
                          <p className="text-sm font-medium text-white">
                            ₱
                            {selectedRental.total_price?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">
                            Start Date
                          </p>
                          <p className="text-sm font-medium text-white">
                            {formatDate(selectedRental.start_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">
                            End Date
                          </p>
                          <p className="text-sm font-medium text-white">
                            {formatDate(selectedRental.end_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">
                            Duration
                          </p>
                          <p className="text-sm font-medium text-white">
                              {inclusiveDays(selectedRental.start_date, selectedRental.end_date)}{" "}
                            days
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
    ); // Close return() parenthesis
  }; // Close RentalDetailModal function definition

  const DeleteConfirmModal = ({ rentalId, onClose, onConfirm }) => (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 mb-4">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Delete Rental
          </h3>
          <p className="text-gray-300 mb-6">
            Are you sure you want to delete this rental? This action cannot be
            undone and will permanently remove all associated data.
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
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading rental management...</p>
        </div>
      </div>
    );
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 md:py-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">
            Rental Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            Manage rentals & customer relationships
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 md:p-4 mb-4 md:mb-6">
          <div className="flex flex-col lg:flex-row gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search customer, email, equipment..."
                  className="w-full pl-9 pr-3 py-2 md:py-2.5 text-sm border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="lg:w-64 flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous month"
                className="p-2 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                {getMonthOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next month"
                className="p-2 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
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
                    selectedStatus === filter.key
                      ? "bg-blue-500 text-white"
                      : "bg-gray-600 text-gray-300"
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
            <h3 className="text-lg font-semibold text-white mb-2">
              No rentals found
            </h3>
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
        {selectedRental && (
          <RentalDetailModal
            rental={selectedRental}
            onClose={() => {
              setSelectedRental(null);
              setSelectedUser(null);
            }}
          />
        )}
        {showDeleteConfirm && (
          <DeleteConfirmModal
            rentalId={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(null)}
            onConfirm={handleDeleteRental}
          />
        )}
        {showConflictModal && conflictData && (
          <ConflictResolutionModal
            isOpen={showConflictModal}
            rental={conflictData.rental}
            conflicts={conflictData.conflicts}
            availableUnits={conflictData.availableUnits}
            loading={conflictLoading}
            onClose={() => {
              setShowConflictModal(false);
              setConflictData(null);
            }}
            onConfirmWithCurrentUnit={handleConfirmWithCurrentUnit}
            onTransferToUnit={handleTransferToUnit}
            onRejectConflicts={handleRejectConflicts}
          />
        )}
        {showPaymentModal && selectedPaymentRental && (
          <PaymentVerificationModal
            rental={selectedPaymentRental}
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedPaymentRental(null);
            }}
            onVerify={handleVerifyPayment}
            onReject={handleRejectPayment}
          />
        )}
      </div>
    </div>
  );
}
