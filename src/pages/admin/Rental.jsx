import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ChevronLeft, ChevronRight, ClipboardList, Loader2, Search } from "lucide-react";
import { subscribeToAllRentals, unsubscribeFromChannel } from "@services/realtimeService";
import { adminRejectApplication, adminStartRental, adminForceDeleteRental, adminRemoveCancelledRental } from "@services/rentalService";
import { adminConfirmReceived, adminConfirmReturned, adminMarkDelivered } from "@services/bookingService";
import { getSignedContractUrl } from "@services/pdfService";
import { getUserById } from "@services/userService";
import { useRentalFilters } from "@hooks/useRentalFilters";
import { useActionLoadingMap } from "@hooks/useActionLoadingMap";
import { useRentalConflicts } from "@hooks/useRentalConflicts";
import { usePaymentVerification } from "@hooks/usePaymentVerification";
import { RentalCard } from "@components/admin/rentals/RentalCard";
import { RentalDetailModal } from "@components/admin/rentals/RentalDetailModal";
import { DeleteConfirmModal } from "@components/admin/rentals/DeleteConfirmModal";
import ConflictResolutionModal from "@components/admin/modals/ConflictResolutionModal";
import { PaymentVerificationModal } from "@components/admin/payment/PaymentVerificationComponents";
import useRentalStore from "@stores/rentalStore";

export default function Rentals() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { allRentals, loadAllRentals, loading } = useRentalStore();

  const {
    rentals,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    handleStatusChange,
    selectedMonth,
    handleMonthChange,
    handlePrevMonth,
    handleNextMonth,
    monthOptions,
    statusFilters,
    highlightId,
    setHighlightParam,
  } = useRentalFilters({ allRentals, searchParams, setSearchParams });

  const { actionLoading, runWithLoading } = useActionLoadingMap();

  const {
    showConflictModal,
    conflictData,
    conflictLoading,
    approveRental,
    confirmWithCurrentUnit,
    transferToUnit,
    rejectConflicts,
    closeConflictModal,
  } = useRentalConflicts({
    allRentals,
    loadAllRentals,
    handleStatusChange,
    setHighlightParam,
  });

  const {
    showPaymentModal,
    selectedPaymentRental,
    openModalForRental,
    closeModal,
    verifyPayment,
    rejectPayment,
    openPaymentReceipt,
  } = usePaymentVerification({ loadAllRentals });

  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [contractViewLoading, setContractViewLoading] = useState({});
  const [contractViewError, setContractViewError] = useState({});
  const cardRefs = useRef({});

  const registerCardRef = useCallback((id, element) => {
    if (!element) {
      delete cardRefs.current[id];
    } else {
      cardRefs.current[id] = element;
    }
  }, []);

  useEffect(() => {
    loadAllRentals();
    const channel = subscribeToAllRentals();
    return () => {
      unsubscribeFromChannel(channel);
    };
  }, [loadAllRentals]);

  useEffect(() => {
    if (!highlightId) return undefined;
    const scrollTimer = setTimeout(() => {
      const target = cardRefs.current[String(highlightId)];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
    const clearTimer = setTimeout(() => {
      setHighlightParam(null);
    }, 3200);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightId, rentals, setHighlightParam]);

  const handleViewDetails = async (rental) => {
    setSelectedRental(rental);
    try {
      const userData = await getUserById(rental.user_id);
      setSelectedUser(userData);
    } catch (error) {
      console.error("Failed to load user details", error);
      setSelectedUser(null);
    }
  };

  const viewContract = async (rentalId, contractFilePath) => {
    if (!contractFilePath) {
      setContractViewError((prev) => ({
        ...prev,
        [rentalId]: "Contract file path is missing.",
      }));
      console.warn("Contract file path is missing for rental", rentalId);
      return;
    }
    setContractViewLoading((prev) => ({ ...prev, [rentalId]: true }));
    setContractViewError((prev) => {
      const next = { ...prev };
      delete next[rentalId];
      return next;
    });
    try {
      const signedUrl = await getSignedContractUrl(contractFilePath);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
      console.info("Opened contract in new tab for rental", rentalId);
    } catch (error) {
      console.error("Could not generate contract link", error);
      setContractViewError((prev) => ({
        ...prev,
        [rentalId]:
          error instanceof Error
            ? error.message
            : "Could not generate link to view contract.",
      }));
    } finally {
      setContractViewLoading((prev) => {
        const next = { ...prev };
        delete next[rentalId];
        return next;
      });
    }
  };

  const handleApprove = (rentalId) =>
    runWithLoading(rentalId, "approve", () => approveRental(rentalId));

  const handleReject = (rentalId) =>
    runWithLoading(rentalId, "reject", async () => {
      const result = await adminRejectApplication(rentalId);
      if (result?.error) {
        console.error(`Failed to reject rental: ${result.error}`);
        return;
      }
      console.info("Rental rejected successfully", rentalId);
      await loadAllRentals();
    });

  const handleStartRental = (rentalId) =>
    runWithLoading(rentalId, "start", async () => {
      const result = await adminStartRental(rentalId);
      if (result?.error) {
        console.error(`Failed to start rental: ${result.error}`);
        return;
      }
      console.info("Rental activated successfully", rentalId);
      await loadAllRentals();
    });

  const handleDeleteRental = (rentalId) =>
    runWithLoading(rentalId, "delete", async () => {
      const result = await adminForceDeleteRental(rentalId);
      if (result?.error) {
        console.error(`Failed to delete rental: ${result.error}`);
        return;
      }
      console.info("Rental deleted successfully", rentalId);
      await loadAllRentals();
      setShowDeleteConfirm(null);
    });

  const handleRemoveCancelledRental = (rentalId) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this cancelled rental? This will free up the dates and permanently delete the record."
    );
    if (!confirmed) return;
    runWithLoading(rentalId, "remove", async () => {
      const result = await adminRemoveCancelledRental(rentalId);
      if (result?.error) {
        console.error(`Failed to remove cancelled rental: ${result.error}`);
        return;
      }
      console.info("Cancelled rental removed successfully", rentalId);
      await loadAllRentals();
    });
  };

  const handleConfirmReceived = (rentalId) =>
    runWithLoading(rentalId, "received", async () => {
      const result = await adminConfirmReceived(rentalId);
      if (result?.success) {
        console.info("Confirmed customer receipt", rentalId);
        await loadAllRentals();
      } else {
        console.error(
          `Failed to confirm receipt: ${result?.error || "Unknown error"}`
        );
      }
    });

  const handleConfirmReturned = (rentalId) =>
    runWithLoading(rentalId, "returned", async () => {
      const result = await adminConfirmReturned(rentalId);
      if (result?.success) {
        console.info("Confirmed customer return", rentalId);
        await loadAllRentals();
      } else {
        console.error(
          `Failed to confirm return: ${result?.error || "Unknown error"}`
        );
      }
    });

  const handleMarkDelivered = (rentalId) =>
    runWithLoading(rentalId, "delivered", async () => {
      const result = await adminMarkDelivered(rentalId);
      if (result?.success) {
        console.info("Marked rental as delivered", rentalId);
        await loadAllRentals();
      } else {
        console.error(
          `Failed to mark as delivered: ${result?.error || "Unknown error"}`
        );
      }
    });

  const handleManageLogistics = (rentalId) => {
    navigate(`/admin/delivery?rentalId=${rentalId}`);
  };

  const handleOpenPaymentVerification = (rental) => {
    openModalForRental(rental);
  };

  const handleViewPaymentReceipt = (paymentId) => {
    openPaymentReceipt(paymentId);
  };

  const handleDeleteRequest = (rentalId) => {
    setShowDeleteConfirm(rentalId);
  };

  const handleCloseDetailModal = () => {
    setSelectedRental(null);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className="p-6 flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto" />
          <p className="text-gray-400 text-sm">Loading rental management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold text-white">Rental Management</h1>
            <p className="text-gray-400 text-sm md:text-base">Track every rental request and status in one view</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-3 md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search customer, email, or equipment"
                  className="w-full rounded-lg border border-gray-600/50 bg-gray-800/60 py-2 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            <div className="flex w-full items-center gap-2 md:w-72">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-600/50 bg-gray-800/60 text-gray-200 transition-colors hover:bg-blue-600/20 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select
                value={selectedMonth}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="flex-1 rounded-md border border-gray-600/50 bg-gray-800/60 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-600/50 bg-gray-800/60 text-gray-200 transition-colors hover:bg-blue-600/20 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => handleStatusChange(filter.key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                  selectedStatus === filter.key
                    ? "border-blue-500/70 bg-blue-600/80 text-white"
                    : "border-gray-600/50 bg-gray-800/60 text-gray-200 hover:border-blue-500/40 hover:bg-gray-800"
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs ${
                    selectedStatus === filter.key ? "bg-white/20 text-white" : "bg-gray-700 text-gray-200"
                  }`}
                >
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {rentals.length === 0 ? (
          <div className="text-center py-10 bg-gradient-to-br from-gray-900/70 to-gray-800/50 border border-gray-700/50 rounded-2xl">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">No rentals found</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              {searchTerm
                ? "No rentals match your search criteria. Try adjusting your filters."
                : "There are no rentals with the selected status at this time."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {rentals.map((rental) => (
              <RentalCard
                key={rental.id}
                rental={rental}
                isHighlighted={String(highlightId) === String(rental.id)}
                registerCardRef={registerCardRef}
                actionLoading={actionLoading}
                contractViewLoading={contractViewLoading}
                contractViewError={contractViewError}
                onApprove={handleApprove}
                onReject={handleReject}
                onStart={handleStartRental}
                onManageLogistics={handleManageLogistics}
                onViewContract={viewContract}
                onViewDetails={handleViewDetails}
                onDelete={handleDeleteRequest}
                onOpenPaymentVerification={handleOpenPaymentVerification}
                onViewPaymentReceipt={handleViewPaymentReceipt}
                onRemoveCancelled={handleRemoveCancelledRental}
                onConfirmReceived={handleConfirmReceived}
                onConfirmReturned={handleConfirmReturned}
                onMarkDelivered={handleMarkDelivered}
              />
            ))}
          </div>
        )}
      </div>

      {selectedRental && (
        <RentalDetailModal
          rental={selectedRental}
          customer={selectedUser}
          onClose={handleCloseDetailModal}
          onManageLogistics={handleManageLogistics}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          rentalId={showDeleteConfirm}
          isLoading={actionLoading[showDeleteConfirm] === "delete"}
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
          onClose={closeConflictModal}
          onConfirmWithCurrentUnit={(rentalId) => confirmWithCurrentUnit(rentalId)}
          onTransferToUnit={(rentalId, unitId) => transferToUnit(rentalId, unitId)}
          onRejectConflicts={rejectConflicts}
        />
      )}

      {showPaymentModal && selectedPaymentRental && (
        <PaymentVerificationModal
          isOpen={showPaymentModal}
          rental={selectedPaymentRental}
          onClose={closeModal}
          onVerify={verifyPayment}
          onReject={rejectPayment}
        />
      )}
    </div>
  );
}
