// src/hooks/useAuth.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCurrentUser } from '../services/authService';

/**************************************
 * useAuth Hook
 * ------------------------------
 * What it does:
 * - Checks if someone is logged in
 * - Updates the user when they log in or out
 * 
 * What it gives:
 * - user: the person using the app (or null)
 * - loading: true while checking
 * 
 * If something's not working:
 * - Make sure getCurrentUser() is okay
 * - Check if Supabase auth is set up right
 **************************************/


export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { user } = await getCurrentUser();
      setUser(user);
      setLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
};