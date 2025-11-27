import { useState, useEffect } from "react";
import { supabase } from "./initSupabase";

/**
 * Custom hook to get the current user
 * Replaces deprecated useUser from @supabase/auth-helpers-react
 * Returns undefined while loading, then user object or null
 */
export function useUser() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    let mounted = true;

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) {
        setUser(user);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  return user;
}

/**
 * Custom hook to get the current session
 * Replaces deprecated useSession from @supabase/auth-helpers-react
 */
export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  return session;
}

/**
 * Custom hook to get the Supabase client
 * Replaces deprecated useSupabaseClient from @supabase/auth-helpers-react
 */
export function useSupabaseClient() {
  return supabase;
}
