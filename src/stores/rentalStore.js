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
      set({
        rentals: Array.isArray(data) ? data : [],
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
