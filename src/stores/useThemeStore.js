import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark', // Default theme
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light',
      })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage', // name of the item in the storage (must be unique)
    }
  )
);

export default useThemeStore;
