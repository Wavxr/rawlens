import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import {
  adminVerifyRentalPayment,
  userUpdatePaymentStatus,
  getPaymentReceiptUrl,
} from "../services/paymentService";

// Encapsulates rental payment verification flow for reuse in admin screens.
export function usePaymentVerification({ loadAllRentals }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentRental, setSelectedPaymentRental] = useState(null);

  const closeModal = useCallback(() => {
    setShowPaymentModal(false);
    setSelectedPaymentRental(null);
  }, []);

  const openModalForRental = useCallback((rental) => {
    const initialPayment = rental.payments?.find(
      (payment) => payment.payment_type === "rental" && !payment.extension_id
    );
    if (!initialPayment) {
      toast.error("No payment record found for this rental");
      return;
    }
    setSelectedPaymentRental({
      ...rental,
      selectedPayment: initialPayment,
      payment_status: initialPayment.payment_status,
      payment_receipt_url: initialPayment.payment_receipt_url,
    });
    setShowPaymentModal(true);
  }, []);

  const verifyPayment = useCallback(
    async (paymentId) => {
      try {
        const result = await adminVerifyRentalPayment(paymentId);
        if (!result.success) {
          throw new Error(result.error || "Verification failed");
        }
        toast.success("Payment verified successfully!");
        await loadAllRentals();
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`Failed to verify payment: ${message}`);
        throw error;
      }
    },
    [loadAllRentals]
  );

  const rejectPayment = useCallback(
    async (paymentId, reason) => {
      try {
        const result = await userUpdatePaymentStatus(paymentId, reason);
        if (!result.success) {
          throw new Error(result.error || "Rejection failed");
        }
        toast.success("Payment rejected.");
        await loadAllRentals();
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`Failed to reject payment: ${message}`);
        throw error;
      }
    },
    [loadAllRentals]
  );

  const openPaymentReceipt = useCallback(async (paymentId) => {
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
  }, []);

  return {
    showPaymentModal,
    selectedPaymentRental,
    openModalForRental,
    closeModal,
    verifyPayment,
    rejectPayment,
    openPaymentReceipt,
  };
}
