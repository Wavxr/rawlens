import { create } from 'zustand';

const useRentalStore = create((set) => ({
  rentals: [],
  setRentals: (data) => set({ rentals: data }),

  addOrUpdateRental: (rental) =>
    set((state) => {
      const exists = state.rentals.find((r) => r.id === rental.id);
      if (exists) {
        return {
          rentals: state.rentals.map((r) => (r.id === rental.id ? rental : r))
        };
      } else {
        return { rentals: [...state.rentals, rental] };
      }
    }),

  removeRental: (id) =>
    set((state) => ({
      rentals: state.rentals.filter((r) => r.id !== id)
    }))
}));

export default useRentalStore;
