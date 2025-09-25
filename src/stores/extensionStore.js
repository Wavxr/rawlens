import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useExtensionStore = create()(
  devtools(
    (set, get) => ({
      extensions: [],
      loading: false,
      error: null,
      selectedExtension: null,
      filterStatus: 'all', // 'all', 'pending', 'approved', 'rejected'
      filterRole: 'all', // 'all', 'user', 'admin'

      // Set all extensions
      setExtensions: (extensions) =>
        set({ extensions, error: null }, false, 'setExtensions'),

      // Add or update a single extension
      addOrUpdateExtension: (extension) =>
        set(
          (state) => {
            const existingIndex = state.extensions.findIndex(e => e.id === extension.id);
            if (existingIndex >= 0) {
              // Update existing extension
              const updatedExtensions = [...state.extensions];
              updatedExtensions[existingIndex] = extension;
              return { extensions: updatedExtensions };
            } else {
              // Add new extension
              return { extensions: [...state.extensions, extension] };
            }
          },
          false,
          'addOrUpdateExtension'
        ),

      // Remove an extension
      removeExtension: (extensionId) =>
        set(
          (state) => ({
            extensions: state.extensions.filter(e => e.id !== extensionId)
          }),
          false,
          'removeExtension'
        ),

      // Set loading state
      setLoading: (loading) =>
        set({ loading }, false, 'setLoading'),

      // Set error state
      setError: (error) =>
        set({ error }, false, 'setError'),

      // Clear all extensions
      clearExtensions: () =>
        set({ extensions: [], error: null }, false, 'clearExtensions'),

      // Get extension by ID
      getExtensionById: (extensionId) => {
        const state = get();
        return state.extensions.find(e => e.id === extensionId);
      },

      // Get extensions by user ID (requested_by)
      getExtensionsByUserId: (userId) => {
        const state = get();
        return state.extensions.filter(e => e.requested_by === userId);
      },

      // Get extensions by rental ID
      getExtensionsByRentalId: (rentalId) => {
        const state = get();
        return state.extensions.filter(e => e.rental_id === rentalId);
      },

      // Get extensions by status
      getExtensionsByStatus: (status) => {
        const state = get();
        return state.extensions.filter(e => e.extension_status === status);
      },

      // Get pending extensions
      getPendingExtensions: () => {
        const state = get();
        return state.extensions.filter(e => e.extension_status === 'pending');
      },

      // Get approved extensions
      getApprovedExtensions: () => {
        const state = get();
        return state.extensions.filter(e => e.extension_status === 'approved');
      },

      // Get rejected extensions
      getRejectedExtensions: () => {
        const state = get();
        return state.extensions.filter(e => e.extension_status === 'rejected');
      },

      // Set selected extension
      setSelectedExtension: (extension) =>
        set({ selectedExtension: extension }, false, 'setSelectedExtension'),

      // Clear selected extension
      clearSelectedExtension: () =>
        set({ selectedExtension: null }, false, 'clearSelectedExtension'),

      // Set filter status
      setFilterStatus: (status) =>
        set({ filterStatus: status }, false, 'setFilterStatus'),

      // Set filter role
      setFilterRole: (role) =>
        set({ filterRole: role }, false, 'setFilterRole'),

      // Get filtered extensions based on current filters
      getFilteredExtensions: () => {
        const state = get();
        let filtered = state.extensions;

        if (state.filterStatus !== 'all') {
          filtered = filtered.filter(e => e.extension_status === state.filterStatus);
        }

        if (state.filterRole !== 'all') {
          filtered = filtered.filter(e => e.requested_by_role === state.filterRole);
        }

        return filtered;
      },

      // Get extensions by requested_by_role
      getExtensionsByRole: (role) => {
        const state = get();
        return state.extensions.filter(e => e.requested_by_role === role);
      }
    }),
    {
      name: 'extension-store'
    }
  )
);

export default useExtensionStore;