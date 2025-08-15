import { create } from 'zustand';
import { getUserRentals } from '../services/rentalService';

// Add this to your rentalStore
const useRentalStore = create((set, get) => ({
  rentals: [],
  loading: false,
  error: null,
  // Keep track of user rentals separately
  userRentalIds: new Set(), 
  
  setRentals: (data) => set({ 
    rentals: data,
    userRentalIds: new Set(data.map(r => r.id))
  }),

  addOrUpdateRental: (rental) =>
    set((state) => {
      const exists = state.rentals.find((r) => r.id === rental.id);
      let newRentals;
      if (exists) {
        newRentals = state.rentals.map((r) => (r.id === rental.id ? rental : r));
      } else {
        newRentals = [...state.rentals, rental];
      }
      return {
        rentals: newRentals,
        userRentalIds: new Set([...state.userRentalIds, rental.id])
      };
    }),

  removeRental: (id) =>
    set((state) => ({
      rentals: state.rentals.filter((r) => r.id !== id),
      userRentalIds: new Set([...state.userRentalIds].filter(rentalId => rentalId !== id))
    })),
    
  // Add a method to check if a rental belongs to current user
  isUserRental: (id) => get().userRentalIds.has(id),
    
  loadRentals: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await getUserRentals(userId);
      if (error) throw error;
      set({ 
        rentals: Array.isArray(data) ? data : [],
        loading: false,
        userRentalIds: new Set(data.map(r => r.id))
      });
    } catch (error) {
      console.error('Failed to load rentals:', error);
      set({ 
        error: error.message || 'Failed to load rentals',
        loading: false 
      });
    }
  }
}));

export default useRentalStore;
