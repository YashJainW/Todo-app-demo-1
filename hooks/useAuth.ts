import { useState, useEffect } from "react";
import { supabase, User } from "../lib/supabase";
import * as SecureStore from "expo-secure-store";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase is configured
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Check for existing session
    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("=== AUTH STATE CHANGE ===");
      console.log("Event:", event);
      console.log("Session user:", session?.user?.email);
      console.log("Current user state before change:", user?.email);

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        if (session?.user) {
          const firstName =
            (session.user.user_metadata as any)?.first_name ||
            (session.user.user_metadata as any)?.full_name ||
            (session.user.user_metadata as any)?.name ||
            "";
          const userData = {
            id: session.user.id,
            email: session.user.email || "",
            created_at: session.user.created_at || "",
            name: firstName,
          };
          console.log("Setting user data:", userData);
          setUser(userData);
          console.log("User state should now be set to:", userData.email);
        }
      } else if (event === "SIGNED_OUT") {
        console.log("Clearing user data");
        setUser(null);
        console.log("User state should now be null");
      }
      setLoading(false);
      console.log("=== END AUTH STATE CHANGE ===");
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    if (!supabase) return;

    try {
      console.log("Checking user session...");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("Session check result:", session?.user?.email);

      if (session?.user) {
        const firstName =
          (session.user.user_metadata as any)?.first_name ||
          (session.user.user_metadata as any)?.full_name ||
          (session.user.user_metadata as any)?.name ||
          "";
        const userData = {
          id: session.user.id,
          email: session.user.email || "",
          created_at: session.user.created_at || "",
          name: firstName,
        };
        console.log("Setting user data from session:", userData);
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking user session:", error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string) => {
    if (!supabase) {
      return { data: null, error: new Error("Supabase not configured") };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
          },
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { data: null, error: new Error("Supabase not configured") };
    }

    try {
      setLoading(true); // Set loading during sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // The auth state change listener will handle the user state update
      console.log("Sign in successful, waiting for auth state change...");

      return { data, error: null };
    } catch (error) {
      setLoading(false); // Reset loading on error
      return { data: null, error };
    }
  };

  const signOut = async () => {
    if (!supabase) return;

    try {
      console.log("Signing out...");
      setLoading(true); // Set loading during sign out
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear secure storage
      await SecureStore.deleteItemAsync("user_session");

      // The auth state change listener will handle the user state update
      console.log("Sign out successful, waiting for auth state change...");
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false); // Reset loading on error
    }
  };

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
