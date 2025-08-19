import { create } from 'zustand';

const useUserStore = create((set) => ({
  users: [],
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
    }))
}));

export default useUserStore;
