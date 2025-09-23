import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const usePaymentStore = create()(
  devtools(
    (set, get) => ({
      payments: [],
      loading: false,
      error: null,

      // Set all payments
      setPayments: (payments) =>
        set({ payments, error: null }, false, 'setPayments'),

      // Add or update a single payment
      addOrUpdatePayment: (payment) =>
        set(
          (state) => {
            const existingIndex = state.payments.findIndex(p => p.id === payment.id);
            if (existingIndex >= 0) {
              // Update existing payment
              const updatedPayments = [...state.payments];
              updatedPayments[existingIndex] = payment;
              return { payments: updatedPayments };
            } else {
              // Add new payment
              return { payments: [...state.payments, payment] };
            }
          },
          false,
          'addOrUpdatePayment'
        ),

      // Remove a payment
      removePayment: (paymentId) =>
        set(
          (state) => ({
            payments: state.payments.filter(p => p.id !== paymentId)
          }),
          false,
          'removePayment'
        ),

      // Set loading state
      setLoading: (loading) =>
        set({ loading }, false, 'setLoading'),

      // Set error state
      setError: (error) =>
        set({ error }, false, 'setError'),

      // Clear all payments
      clearPayments: () =>
        set({ payments: [], error: null }, false, 'clearPayments'),

      // Get payment by ID
      getPaymentById: (paymentId) => {
        const state = get();
        return state.payments.find(p => p.id === paymentId);
      },

      // Get payments by user ID
      getPaymentsByUserId: (userId) => {
        const state = get();
        return state.payments.filter(p => p.user_id === userId);
      },

      // Get payments by rental ID
      getPaymentsByRentalId: (rentalId) => {
        const state = get();
        return state.payments.filter(p => p.rental_id === rentalId);
      },

      // Get payments by extension ID
      getPaymentsByExtensionId: (extensionId) => {
        const state = get();
        return state.payments.filter(p => p.extension_id === extensionId);
      },

      // Get payments by status
      getPaymentsByStatus: (status) => {
        const state = get();
        return state.payments.filter(p => p.payment_status === status);
      },

      // Get payments by type
      getPaymentsByType: (type) => {
        const state = get();
        return state.payments.filter(p => p.payment_type === type);
      }
    }),
    {
      name: 'payment-store'
    }
  )
);

export default usePaymentStore;