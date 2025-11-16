import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import {
  adminConfirmApplication,
  adminConfirmApplicationWithConflictCheck,
  adminRejectApplication,
  transferRentalToUnit,
  getAvailableUnitsOfModel,
} from "../services/rentalService";

// Centralises conflict-resolution flows so the page component stays focused on layout.
export function useRentalConflicts({
  allRentals,
  loadAllRentals,
  handleStatusChange,
  setHighlightParam,
}) {
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  const openConflictModal = useCallback((payload) => {
    setConflictData(payload);
    setShowConflictModal(true);
  }, []);

  const closeConflictModal = useCallback(() => {
    setShowConflictModal(false);
    setConflictData(null);
  }, []);

  const approveRental = useCallback(
    async (rentalId) => {
      const targetRental = allRentals.find((rental) => rental.id === rentalId);
      const originalStatus = targetRental?.rental_status;
      try {
        const result = await adminConfirmApplicationWithConflictCheck(rentalId);
        if (result.error) {
          toast.error(`Failed to approve rental: ${result.error}`);
          return { success: false };
        }
        if (result.hasConflicts) {
          openConflictModal({
            rental: result.rental,
            conflicts: result.conflicts,
            availableUnits: result.availableUnits,
          });
          return { success: false, conflicts: result.conflicts };
        }
        if (result.success) {
          toast.success("Rental approved successfully!");
          await loadAllRentals();
          if (originalStatus === "pending") {
            handleStatusChange("confirmed");
            setHighlightParam(rentalId);
          }
          return { success: true };
        }
        return { success: false };
      } catch (error) {
        console.error("Error approving rental:", error);
        toast.error("Failed to approve rental");
        return { success: false };
      }
    },
    [allRentals, loadAllRentals, handleStatusChange, setHighlightParam, openConflictModal]
  );

  const confirmWithCurrentUnit = useCallback(
    async (rentalIdOverride) => {
      const targetId = rentalIdOverride || conflictData?.rental?.id;
      if (!targetId) return;
      setConflictLoading(true);
      try {
        const result = await adminConfirmApplication(targetId);
        if (result.error) {
          toast.error(`Failed to confirm rental: ${result.error}`);
          return;
        }
        toast.success("Rental confirmed with current unit (conflicts remain)!");
        closeConflictModal();
        await loadAllRentals();
      } catch (error) {
        console.error("Error confirming with current unit:", error);
        toast.error("Failed to confirm rental");
      } finally {
        setConflictLoading(false);
      }
    },
    [conflictData, closeConflictModal, loadAllRentals]
  );

  const transferToUnit = useCallback(
    async (rentalIdOverride, newUnitId) => {
      const targetId = rentalIdOverride || conflictData?.rental?.id;
      if (!targetId) return;
      setConflictLoading(true);
      try {
        const transferResult = await transferRentalToUnit(targetId, newUnitId);
        if (transferResult.error) {
          toast.error(`Failed to transfer rental: ${transferResult.error}`);
          return;
        }
        const confirmResult = await adminConfirmApplication(targetId);
        if (confirmResult.error) {
          toast.error(
            `Failed to confirm rental after transfer: ${confirmResult.error}`
          );
          return;
        }
        toast.success(`${transferResult.message} and confirmed!`);
        closeConflictModal();
        await loadAllRentals();
      } catch (error) {
        console.error("Error transferring rental:", error);
        toast.error("Failed to transfer rental");
      } finally {
        setConflictLoading(false);
      }
    },
    [conflictData, closeConflictModal, loadAllRentals]
  );

  const rejectConflicts = useCallback(
    async (conflictIds, rejectionReason) => {
      if (!conflictData?.rental?.id) return;
      setConflictLoading(true);
      try {
        const results = await Promise.all(
          conflictIds.map((id) => adminRejectApplication(id, rejectionReason))
        );
        const failures = results.filter((result) => result.error);
        if (failures.length > 0) {
          toast.error(`Failed to reject ${failures.length} booking(s)`);
          return;
        }
        const rejectedCurrent = conflictIds.includes(conflictData.rental.id);
        if (rejectedCurrent) {
          toast.success("Rental application rejected successfully!");
        } else {
          const confirmResult = await adminConfirmApplication(
            conflictData.rental.id
          );
          if (confirmResult.error) {
            toast.error(`Failed to confirm rental: ${confirmResult.error}`);
            return;
          }
          toast.success(
            `Rejected ${conflictIds.length} conflicting booking(s) and confirmed the new rental!`
          );
        }
        closeConflictModal();
        await loadAllRentals();
      } catch (error) {
        console.error("Error rejecting conflicts:", error);
        toast.error("Failed to reject conflicting bookings");
      } finally {
        setConflictLoading(false);
      }
    },
    [conflictData, closeConflictModal, loadAllRentals]
  );

  const prepareTransferForRental = useCallback(
    async (rental) => {
      if (!rental?.cameras?.name) return;
      setConflictLoading(true);
      try {
        const { data: availableUnits } = await getAvailableUnitsOfModel(
          rental.cameras.name,
          rental.start_date,
          rental.end_date,
          rental.id
        );
        if (!availableUnits || availableUnits.length === 0) {
          toast.error("No available units found for transfer.");
          return;
        }
        openConflictModal({
          rental,
          conflicts: [],
          availableUnits,
        });
      } catch (error) {
        console.error("Error checking available units:", error);
        toast.error("Failed to check available units for transfer.");
      } finally {
        setConflictLoading(false);
      }
    },
    [openConflictModal]
  );

  return {
    showConflictModal,
    conflictData,
    conflictLoading,
    approveRental,
    confirmWithCurrentUnit,
    transferToUnit,
    rejectConflicts,
    prepareTransferForRental,
    closeConflictModal,
  };
}
