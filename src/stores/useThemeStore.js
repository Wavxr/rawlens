import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      darkMode: false, // Default theme
      toggleTheme: () => set((state) => {
        const newDarkMode = !state.darkMode;
        document.documentElement.classList.toggle('dark', newDarkMode);
        return { darkMode: newDarkMode };
      }),
      setTheme: (darkMode) => {
        document.documentElement.classList.toggle('dark', darkMode);
        set({ darkMode });
      },
    }),
    {
      name: 'rawlens_theme', // name of the item in the storage (must be unique)
    }
  )
);

// Apply theme on initial load
try {
    const storedState = JSON.parse(localStorage.getItem('rawlens_theme'));
    if (storedState && typeof storedState.state.darkMode === 'boolean') {
        document.documentElement.classList.toggle('dark', storedState.state.darkMode);
    } else {
        document.documentElement.classList.toggle('dark', false); // Default to light mode
    }
} catch (e) {
    console.error("Could not parse theme from localStorage", e);
    document.documentElement.classList.toggle('dark', false);
}


export default useThemeStore;
