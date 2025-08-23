// userStore.js
import { create } from 'zustand';

const useUserStore = create((set) => ({
  users: [],
  // Replace the entire user array with the new user.
  // This is simpler and avoids potential state issues with multiple users in the profile context.
  setUser: (user) => set({ users: user ? [user] : [] }),
  clearUser: () => set({ users: [] }),
  addOrUpdateUser: (user) =>
    set((state) => {
      const exists = state.users.find((u) => u.id === user.id);
      return {
        users: exists
          ? state.users.map((u) => (u.id === user.id ? user : u))
          : [...state.users, user]
      };
    }),
  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId)
    })),
  // Add this new function
  setUsers: (usersArray) => set({ users: usersArray })
}));

export default useUserStore;