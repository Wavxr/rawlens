// src/stores/useAuthStore.js
import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import useSettingsStore from './settingsStore';
import useThemeStore from './useThemeStore';
import useUserStore from './userStore';

const useAuthStore = create((set, get) => ({
  // state
  user: null,
  role: null,
  profile: null, // To hold the detailed user profile from the 'users' table
  session: null,
  loading: true,      // overall auth loading
  roleLoading: false, // true while we’re fetching the role

  /* -------- initialise session -------- */
  initialize: async () => {
    set({ loading: true });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
        set({ user: null, session: null, role: null, profile: null });
        return;
      }

      if (session?.user) {
        set({ session, user: session.user });
        await get().fetchUserData(session.user.id);
      }
    } catch (e) {
      console.error("Critical error during auth initialization:", e);
      set({ user: null, session: null, role: null, profile: null });
    } finally {
      set({ loading: false }); // Ensure loading is always set to false
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const currentUser = get().user;

          // This event fires on tab focus, token refresh, etc.
          // We only want to trigger a full reload if the user actually changes.
          if (event === 'SIGNED_IN' && session?.user?.id !== currentUser?.id) {
            set({ loading: true });
            set({ session, user: session.user });
            await get().fetchUserData(session.user.id);
            set({ loading: false });
          } else if (event === 'SIGNED_OUT') {
            useSettingsStore.getState().clearAll();
            useUserStore.getState().clearUser();
            set({ user: null, session: null, role: null, profile: null });
          }
        } catch (e) {
          console.error("Critical error in onAuthStateChange:", e);
          set({ loading: false }); // Ensure loading is always false on error
        }
      }
    );
    
    return () => {
        authListener.subscription.unsubscribe();
    };
  },

  fetchUserData: async (userId) => {
    set({ roleLoading: true });
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('No user profile found; defaulting to "user" role', error);
        set({ role: 'user', profile: null });
      } else {
        set({ role: data.role || 'user', profile: data });
        useUserStore.getState().setUser(data);
      }

      const currentRole = get().role;
      if (currentRole === 'admin') {
        await useSettingsStore.getState().initAdminSettings(userId);
      } else {
        await useSettingsStore.getState().initUserSettings(userId);
      }
      
      const settings = useSettingsStore.getState().settings;
      if (settings) {
        useThemeStore.getState().setTheme(settings.dark_mode);
      }
    } catch (e) {
      console.error('Critical error in fetchUserData:', e);
      set({ role: 'user', profile: null });
    } finally {
      set({ roleLoading: false });
    }
  },

  /* -------- login / logout -------- */
  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange will handle the rest
  },

  logout: async () => {
    await supabase.auth.signOut();
    // onAuthStateChange will handle the rest
  },
  
  register: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
}));

useAuthStore.getState().initialize();

export default useAuthStore;
