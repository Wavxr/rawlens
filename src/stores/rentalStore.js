import { create } from 'zustand';
import { getUserRentals, getRentalsByStatus } from '../services/rentalService';

// Add this to your rentalStore
const useRentalStore = create((set) => ({
  rentals: [],
  allRentals: [],
  loading: false,
  error: null,

  setRentals: (data) => set({ rentals: data }),

  addOrUpdateRental: (rental) =>
    set((state) => {
      const updateList = (list) => {
        const index = list.findIndex((r) => r.id === rental.id);
        if (index !== -1) {
          const newList = [...list];
          newList[index] = rental;
          return newList;
        } else {
          return [...list, rental];
        }
      };

      return {
        rentals: updateList(state.rentals),
        allRentals: updateList(state.allRentals),
      };
    }),

  syncPaymentForRental: (payment) =>
    set((state) => {
      if (!payment?.rental_id) {
        return {};
      }

      const updateList = (list) => {
        if (!Array.isArray(list) || list.length === 0) {
          return list;
        }

        let mutated = false;
        const nextList = list.map((rental) => {
          if (rental.id !== payment.rental_id) {
            return rental;
          }

          const existingPayments = Array.isArray(rental.payments) ? [...rental.payments] : [];
          const index = existingPayments.findIndex((p) => p.id === payment.id);

          if (index !== -1) {
            const current = existingPayments[index];
            const isSameReference = current === payment;
            if (!isSameReference) {
              existingPayments[index] = payment;
              mutated = true;
            }
          } else {
            existingPayments.push(payment);
            mutated = true;
          }

          if (!mutated) {
            return rental;
          }

          return {
            ...rental,
            payments: existingPayments,
          };
        });

        return mutated ? nextList : list;
      };

      const rentals = updateList(state.rentals);
      const allRentals = updateList(state.allRentals);

      if (rentals === state.rentals && allRentals === state.allRentals) {
        return {};
      }

      return { rentals, allRentals };
    }),

  removePaymentFromRental: ({ paymentId, rentalId }) =>
    set((state) => {
      if (!paymentId || !rentalId) {
        return {};
      }

      const updateList = (list) => {
        if (!Array.isArray(list) || list.length === 0) {
          return list;
        }

        let mutated = false;
        const nextList = list.map((rental) => {
          if (rental.id !== rentalId || !Array.isArray(rental.payments)) {
            return rental;
          }

          const filtered = rental.payments.filter((payment) => payment.id !== paymentId);

          if (filtered.length === rental.payments.length) {
            return rental;
          }

          mutated = true;
          return {
            ...rental,
            payments: filtered,
          };
        });

        return mutated ? nextList : list;
      };

      const rentals = updateList(state.rentals);
      const allRentals = updateList(state.allRentals);

      if (rentals === state.rentals && allRentals === state.allRentals) {
        return {};
      }

      return { rentals, allRentals };
    }),

  removeRental: (id) =>
    set((state) => ({
      rentals: state.rentals.filter((r) => r.id !== id),
      allRentals: state.allRentals.filter((r) => r.id !== id),
    })),

  loadRentals: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await getUserRentals(userId);
      if (error) throw error;
      const normalized = Array.isArray(data) ? data : [];
      set({
        rentals: normalized,
        allRentals: normalized,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load rentals:', error);
      set({
        error: error.message || 'Failed to load rentals',
        loading: false,
      });
    }
  },

  loadAllRentals: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await getRentalsByStatus();
      if (error) throw error;
      set({
        allRentals: Array.isArray(data) ? data : [],
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load all rentals:', error);
      set({
        error: error.message || 'Failed to load all rentals',
        loading: false,
      });
    }
  },
}));

export default useRentalStore;
