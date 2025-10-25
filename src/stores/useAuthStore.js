import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import useSettingsStore from './settingsStore';
import useThemeStore from './useThemeStore';
import useUserStore from './userStore';
import { 
  mapUserTokenOnLogin, 
  mapAdminTokenOnLogin, 
  unmapUserTokenOnLogout, 
  unmapAdminTokenOnLogout 
} from '../utils/tokenLifecycle';

const useAuthStore = create((set, get) => ({
  // state
  user: null,
  role: null,
  profile: null,
  session: null,
  loading: true,    
  roleLoading: false, 

  /* -------- initialise session -------- */
  initialize: async () => {
    set({ loading: true });
    try {
      // First check if we can even communicate with Supabase
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
        // If there's an error getting the session, clear everything
        get().forceCleanup();
        return;
      }

      if (session?.user) {
        console.log('Found existing session for user:', session.user.id);
        set({ session, user: session.user });
        
        try {
          await get().fetchUserData(session.user.id);
          
          // Map FCM tokens for existing session on app startup
          const userRole = get().role;
          try {
            if (userRole === 'admin') {
              await mapAdminTokenOnLogin(session.user.id);
            } else {
              await mapUserTokenOnLogin(session.user.id);
            }
          } catch (fcmError) {
            console.warn('FCM token mapping failed during initialization, continuing app startup:', fcmError);
          }
        } catch (userDataError) {
          console.error('Failed to fetch user data during initialization:', userDataError);
          // If we can't fetch user data, the session might be invalid
          get().forceCleanup();
          return;
        }
      } else {
        console.log('No existing session found');
        get().forceCleanup();
      }
    } catch (e) {
      console.error("Critical error during auth initialization:", e);
      get().forceCleanup();
    } finally {
      set({ loading: false }); // Ensure loading is always set to false
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const currentUser = get().user;

          console.log(' Auth state change:', event, 'current user:', currentUser?.id, 'new session user:', session?.user?.id);

          // This event fires on tab focus, token refresh, etc.
          // We only want to trigger a full reload if the user actually changes.
          if (event === 'SIGNED_IN' && session?.user?.id !== currentUser?.id) {
            console.log('New user signed in, initializing...');
            set({ loading: true });
            set({ session, user: session.user });
            await get().fetchUserData(session.user.id);
            
            // Map FCM tokens for the logged-in user session
            const userRole = get().role;
            if (userRole === 'admin') {
              await mapAdminTokenOnLogin(session.user.id);
            } else {
              await mapUserTokenOnLogin(session.user.id);
            }
            
            set({ loading: false });
          } else if (event === 'SIGNED_OUT') {
            console.log('SIGNED_OUT event received');
            
            // Always ensure state is cleared on SIGNED_OUT
            const currentState = get();
            if (currentState.user || currentState.session) {
              console.log('Clearing remaining state on SIGNED_OUT');
              get().forceCleanup();
            }
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('Token refreshed for user:', session.user.id);
            // Update session but don't reload user data
            set({ session, user: session.user });
          } else if (event === 'USER_UPDATED' && session) {
            console.log('User updated:', session.user.id);
            set({ session, user: session.user });
          }
        } catch (e) {
          console.error("Critical error in onAuthStateChange:", e);
          set({ loading: false }); // Ensure loading is always false on error
          
          // On critical error during auth state change, ensure we're in a clean state
          if (e.message?.includes('session') || e.message?.includes('auth')) {
            console.log('Auth error detected, performing emergency cleanup');
            get().forceCleanup();
          }
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
    console.log('Starting logout process...');
    try {
      const currentUser = get().user;
      const currentRole = get().role;
      const currentSession = get().session;
      
      console.log('Current user before logout:', currentUser?.id, 'role:', currentRole);
      
      // Check if we already have a valid session before attempting logout
      let hasValidSession = false;
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        hasValidSession = !error && session?.user?.id;
        console.log('Session check result:', hasValidSession ? 'Valid session found' : 'No valid session');
      } catch (sessionError) {
        console.warn('Session check failed:', sessionError);
        hasValidSession = false;
      }
      
      // If no valid session and no current user, we're already logged out
      if (!hasValidSession && !currentUser && !currentSession) {
        console.log(' Already logged out - performing cleanup only');
        get().forceCleanup();
        return;
      }
      
      // Handle FCM token unmapping (only if we have user info)
      if (currentUser?.id) {
        try {
          console.log(' Unmapping FCM tokens...');
          if (currentRole === 'admin') {
            await unmapAdminTokenOnLogout(currentUser.id);
          } else {
            await unmapUserTokenOnLogout(currentUser.id);
          }
          console.log(' FCM tokens unmapped successfully');
        } catch (fcmError) {
          console.warn(' FCM token unmapping failed, continuing logout:', fcmError);
        }
      }
      
      // Clear all stores immediately
      console.log('🔧 Clearing all store states...');
      get().forceCleanup();
      
      // Only call Supabase signOut if we have a valid session
      if (hasValidSession) {
        console.log('Calling Supabase signOut...');
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Supabase logout error (but state already cleared):', error);
        } else {
          console.log('Supabase logout successful');
        }
      } else {
        console.log('Skipping Supabase signOut - no valid session');
      }
      
    } catch (e) {
      console.error('Critical logout error:', e);
      // Ensure state is cleared even on critical error
      console.log('Emergency state clearing...');
      get().forceCleanup();
    }
  },

  forceCleanup: () => {
    console.log('Performing force cleanup of all auth state...');
    useSettingsStore.getState().clearAll();
    useUserStore.getState().clearUser();
    set({ user: null, session: null, role: null, profile: null });
    
    // Clear localStorage items that might persist
    const itemsToRemove = [
      'rawlens_user_settings',
      'rawlens_admin_settings',
      'sb-' // Supabase tokens start with this prefix
    ];
    
    Object.keys(localStorage).forEach(key => {
      if (itemsToRemove.some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('Force cleanup completed');
  },
  
  register: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  // Utility method to check if current session is valid
  checkSessionValidity: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Session validity check failed:', error);
        return false;
      }
      return session?.user?.id ? true : false;
    } catch (e) {
      console.error('Critical error checking session validity:', e);
      return false;
    }
  },

  // Method to safely refresh user data if session is valid
  refreshUserData: async () => {
    const isValid = await get().checkSessionValidity();
    if (!isValid) {
      console.log('Session invalid, performing cleanup');
      get().forceCleanup();
      return false;
    }
    
    const currentUser = get().user;
    if (currentUser?.id) {
      await get().fetchUserData(currentUser.id);
      return true;
    }
    
    return false;
  },
}));

useAuthStore.getState().initialize();

export default useAuthStore;
