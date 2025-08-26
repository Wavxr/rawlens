import { create } from "zustand";
import { 
  getUserSettings, 
  getAdminSettings, 
  updateUserSettings, 
  updateAdminSettings, 
  createUserSettings, 
  createAdminSettings 
} from "../services/settingsService";

const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: true,
  currentRole: null,

  /**
   * Initialize user settings from user_settings table
   * @param {string} userId - User ID
   */
  initUserSettings: async (userId) => {
    set({ loading: true, currentRole: 'user' });
    const cached = localStorage.getItem('rawlens_user_settings');
    if (cached) {
      set({ settings: JSON.parse(cached), loading: false });
    }

    try {
      let fresh = await getUserSettings(userId);
      if (!fresh) {
        fresh = await createUserSettings(userId);
      }
      set({ settings: fresh, loading: false, currentRole: 'user' });
      localStorage.setItem('rawlens_user_settings', JSON.stringify(fresh));
    } catch (error) {
      console.error("Failed to initialize user settings:", error);
      set({ loading: false });
    }
  },

  /**
   * Initialize admin settings from admin_settings table
   * @param {string} userId - User ID
   */
  initAdminSettings: async (userId) => {
    set({ loading: true, currentRole: 'admin' });
    const cached = localStorage.getItem('rawlens_admin_settings');
    if (cached) {
      set({ settings: JSON.parse(cached), loading: false });
    }

    try {
      let fresh = await getAdminSettings(userId);
      if (!fresh) {
        fresh = await createAdminSettings(userId);
      }
      set({ settings: fresh, loading: false, currentRole: 'admin' });
      localStorage.setItem('rawlens_admin_settings', JSON.stringify(fresh));
    } catch (error) {
      console.error("Failed to initialize admin settings:", error);
      set({ loading: false });
    }
  },

  /**
   * Update user settings in user_settings table
   * @param {string} userId - User ID
   * @param {Object} updates - Settings to update
   */
  updateUserSettings: async (userId, updates) => {
    try {
      const currentSettings = get().settings;
      set({ settings: { ...currentSettings, ...updates } });
      
      const newSettings = await updateUserSettings(userId, updates);
      set({ settings: newSettings });
      localStorage.setItem('rawlens_user_settings', JSON.stringify(newSettings));
      return newSettings;
    } catch (error) {
      console.error("Failed to update user settings:", error);
      set({ settings: get().settings });
    }
  },

  /**
   * Update admin settings in admin_settings table
   * @param {string} userId - User ID
   * @param {Object} updates - Settings to update
   */
  updateAdminSettings: async (userId, updates) => {
    try {
      const currentSettings = get().settings;
      set({ settings: { ...currentSettings, ...updates } });
      
      const newSettings = await updateAdminSettings(userId, updates);
      set({ settings: newSettings });
      localStorage.setItem('rawlens_admin_settings', JSON.stringify(newSettings));
      return newSettings;
    } catch (error) {
      console.error("Failed to update admin settings:", error);
      set({ settings: get().settings });
    }
  },

  /**
   * Smart initialization based on current user role
   * @param {string} userId - User ID
   * @param {string} userRole - User role ('user' or 'admin')
   */
  initSettingsForCurrentContext: async (userId, userRole) => {
    if (userRole === 'admin') {
      await get().initAdminSettings(userId);
    } else {
      await get().initUserSettings(userId);
    }
  },

  /**
   * Clear user settings
   */
  clearUserSettings: () => {
    localStorage.removeItem('rawlens_user_settings');
    set({ settings: null, loading: false, currentRole: null });
  },

  /**
   * Clear admin settings
   */
  clearAdminSettings: () => {
    localStorage.removeItem('rawlens_admin_settings');
    set({ settings: null, loading: false, currentRole: null });
  },

  /**
   * Clear all role settings
   */
  clearAll: () => {
    localStorage.removeItem('rawlens_user_settings');
    localStorage.removeItem('rawlens_admin_settings');
    set({ settings: null, loading: false, currentRole: null });
  },

  // Backward compatibility methods
  init: async (userId, role = 'user') => {
    await get().initSettingsForCurrentContext(userId, role);
  },

  update: async (userId, updates, role = 'user') => {
    if (role === 'admin') {
      return await get().updateAdminSettings(userId, updates);
    } else {
      return await get().updateUserSettings(userId, updates);
    }
  },

  clear: (role = 'user') => {
    if (role === 'admin') {
      get().clearAdminSettings();
    } else {
      get().clearUserSettings();
    }
  }
}));

export default useSettingsStore;
