import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

// Lets the in-app browser tab close itself and hand control back once the
// Google OAuth redirect lands - required boilerplate per Expo's AuthSession
// docs, safe to call unconditionally.
WebBrowser.maybeCompleteAuthSession();

// Custom scheme registered in app.json ("quietsignal") - Supabase redirects
// here once Google sign-in completes on its side. Doesn't need to be a real
// in-app route: openAuthSessionAsync watches for navigation to this scheme
// and hands the resulting URL straight back to signInWithGoogle() below.
const GOOGLE_REDIRECT_URL = "quietsignal://auth-callback";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  /** True once we know the signed-in user still needs to complete the
   * health-data consent / age-gate flow (e.g. first Google sign-in). */
  needsConsent: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshConsentStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);

  const refreshConsentStatus = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setNeedsConsent(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("consent_given_at")
      .eq("user_id", userId)
      .maybeSingle();
    setNeedsConsent(!data?.consent_given_at);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await refreshConsentStatus();
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) await refreshConsentStatus();
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshConsentStatus]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // Section 4.1 - Google sign-in as an easier alternative to email/password.
  // Requires a Google OAuth client configured in the Supabase Auth
  // dashboard (Authentication > Providers > Google) - see project notes for
  // the exact setup steps. Uses Supabase's browser-mediated OAuth flow via
  // expo-web-browser rather than the native Google Sign-In SDK, since it
  // needs no extra native config beyond the app's existing URL scheme.
  const signInWithGoogle = async () => {
    // Web has no app URL scheme to redirect back to - Google sends the
    // browser straight back to this same page instead, and
    // detectSessionInUrl (see supabase.ts) picks up the resulting session
    // automatically once the page reloads. This function returns
    // immediately after kicking off the redirect; the actual sign-in
    // completes via onAuthStateChange after the page comes back.
    if (Platform.OS === "web") {
      const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: GOOGLE_REDIRECT_URL, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("Could not start Google sign-in.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, GOOGLE_REDIRECT_URL);
    if (result.type !== "success" || !result.url) {
      throw new Error("Google sign-in was cancelled.");
    }

    // Supabase can return either implicit-flow tokens in the URL fragment
    // or a PKCE `code` in the query string, depending on project config -
    // handle both rather than guessing which one is active.
    const hashParams = new URLSearchParams(result.url.split("#")[1] ?? "");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;
      return;
    }

    const queryParams = new URLSearchParams(result.url.split("?")[1] ?? "");
    const code = queryParams.get("code");
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      return;
    }

    throw new Error("Google sign-in did not return a valid session.");
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, needsConsent, signUp, signIn, signInWithGoogle, signOut, refreshConsentStatus }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
