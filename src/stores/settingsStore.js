import { create } from "zustand";
import { getUserSettings, updateUserSettings, createUserSettings } from "../services/settingsService";

const SETTINGS_KEY = "rawlens_settings";

const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: true,
  currentRole: null, // Track which role's settings are currently loaded

  init: async (userId, role = 'user') => {
    set({ loading: true, currentRole: role });
    const cached = localStorage.getItem(`${SETTINGS_KEY}_${role}`);
    if (cached) {
      set({ settings: JSON.parse(cached), loading: false });
    }

    try {
      let fresh = await getUserSettings(userId, role);
      if (!fresh) {
        fresh = await createUserSettings(userId, role);
      }
      set({ settings: fresh, loading: false, currentRole: role });
      localStorage.setItem(`${SETTINGS_KEY}_${role}`, JSON.stringify(fresh));
    } catch (error) {
      console.error("Failed to initialize user settings:", error);
      set({ loading: false });
    }
  },

  update: async (userId, updates, role = 'user') => {
    try {
      const currentSettings = get().settings;
      // Optimistic update
      set({ settings: { ...currentSettings, ...updates } });
      
      const newSettings = await updateUserSettings(userId, updates, role);
      set({ settings: newSettings });
      localStorage.setItem(`${SETTINGS_KEY}_${role}`, JSON.stringify(newSettings));
      return newSettings;
    } catch (error) {
      console.error("Failed to update user settings:", error);
      // Revert on error
      set({ settings: get().settings });
    }
  },
  
  clear: (role = 'user') => {
      localStorage.removeItem(`${SETTINGS_KEY}_${role}`);
      set({ settings: null, loading: false, currentRole: null });
  },

  // Convenience method to clear all role settings
  clearAll: () => {
    localStorage.removeItem(`${SETTINGS_KEY}_user`);
    localStorage.removeItem(`${SETTINGS_KEY}_admin`);
    set({ settings: null, loading: false, currentRole: null });
  }
}));export default useSettingsStore;
