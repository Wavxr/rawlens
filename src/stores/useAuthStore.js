// src/stores/useAuthStore.js
import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

const useAuthStore = create((set) => ({
  // state
  user: null,
  role: null,
  session: null,
  loading: true,      // overall auth loading
  roleLoading: false, // true while we’re fetching the role

  /* -------- initialise session -------- */
  initialize: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error(error);
      return set({ user: null, session: null, role: null, loading: false });
    }

    if (session?.user) {
      set({ session, user: session.user, roleLoading: true });

      // try to get the role, but *always* clear roleLoading afterwards
      await useAuthStore.getState().fetchUserRole(session.user.id);
      set({ roleLoading: false });
    }

    set({ loading: false });
  },

  /* -------- fetch role -------- */
  fetchUserRole: async (uid) => {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', uid)
      .single();

    if (error) {
      console.warn('No role row found; defaulting to "user"');
      // choose: null ➜ treated as regular user, or force 'user'
      return set({ role: 'user' });
    }

    set({ role: data.role || 'user' });
  },

  /* -------- login / logout -------- */
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    set({ session: data.session, user: data.user, roleLoading: true });
    await useAuthStore.getState().fetchUserRole(data.user.id);
    set({ roleLoading: false });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, role: null });
  },
}));

export default useAuthStore;