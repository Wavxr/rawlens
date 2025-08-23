import { create } from "zustand";
import { getUserSettings, updateUserSettings, createUserSettings } from "../services/settingsService";

const SETTINGS_KEY = "rawlens_settings";

const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: true,

  init: async (userId) => {
    set({ loading: true });
    const cached = localStorage.getItem(SETTINGS_KEY);
    if (cached) {
      set({ settings: JSON.parse(cached), loading: false });
    }

    try {
      let fresh = await getUserSettings(userId);
      if (!fresh) {
        fresh = await createUserSettings(userId);
      }
      set({ settings: fresh, loading: false });
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(fresh));
    } catch (error) {
      console.error("Failed to initialize user settings:", error);
      set({ loading: false });
    }
  },

  update: async (userId, updates) => {
    try {
      const currentSettings = get().settings;
      // Optimistic update
      set({ settings: { ...currentSettings, ...updates } });

      const newSettings = await updateUserSettings(userId, updates);
      set({ settings: newSettings });
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      return newSettings;
    } catch (error) {
      console.error("Failed to update user settings:", error);
      // Revert on error
      set({ settings: get().settings });
    }
  },
  
  clear: () => {
      localStorage.removeItem(SETTINGS_KEY);
      set({ settings: null, loading: false });
  }
}));

export default useSettingsStore;
