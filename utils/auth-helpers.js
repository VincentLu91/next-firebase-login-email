import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useUser, useSupabaseClient } from "./supabase-hooks";

/**
 * Custom hook for protected pages that require authentication
 * Handles auth state properly and redirects to signin if not authenticated
 *
 * @returns {Object} { user, customer, loading, supabase }
 */
export function useProtectedPage() {
  const router = useRouter();
  const user = useUser();
  const supabase = useSupabaseClient();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Auth state is still loading
      if (user === undefined) {
        setLoading(true);
        return;
      }

      // User is definitely not logged in
      if (user === null) {
        router.push("/signin");
        return;
      }

      // User is authenticated, fetch customer info
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email)
          .single();

        if (error) throw error;
        setCustomer(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching customer:", error);
        setLoading(false);
      }
    };

    checkAuth();
  }, [user, router, supabase]);

  return { user, customer, loading, supabase };
}

/**
 * Gets customer info for an authenticated user
 * Does NOT redirect - use this for pages that don't require auth
 *
 * @returns {Object} { user, customer, loading, supabase }
 */
export function useCustomerInfo() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      // Auth state is still loading
      if (user === undefined) {
        setLoading(true);
        return;
      }

      // No user logged in
      if (user === null) {
        setCustomer(null);
        setLoading(false);
        return;
      }

      // Fetch customer info
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email)
          .single();

        if (error) throw error;
        setCustomer(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching customer:", error);
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [user, supabase]);

  return { user, customer, loading, supabase };
}
