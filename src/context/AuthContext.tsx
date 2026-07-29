import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { supabase, getPersistedSession, clearPersistedSession } from "@/lib/supabase";
import { reportAuthHang, logPersistedSessionReadDuration } from "@/lib/sentry";
import { PasswordResetError } from "@/lib/authErrors";

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
  /** Sends a password-reset email containing a 6-digit code. Never reveals
   * whether the email has an account (Supabase returns success either way). */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Verifies the emailed recovery code, then sets the new password. On
   * success the user ends up signed in with a fresh session. */
  confirmPasswordReset: (email: string, token: string, newPassword: string) => Promise<void>;
  refreshConsentStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Races a promise against a timeout. Needed because the v23 fix (try/finally
// around session restore) only covers calls that *settle* - getSession() and
// getUser() can also HANG outright (observed 2026-07-24: token expired
// overnight, cold start sat on the bare #0B1128 window forever; sign-out and
// back in "fixed" it by wiping the stored session). A hung await never
// reaches `finally`, so setLoading(false) never ran. This guarantees every
// bootstrap await settles one way or the other.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);

  // True from the moment the user taps "Log out" until they sign in again.
  //
  // The bootstrap getSession() below is deliberately unbounded on the
  // persisted path, and auth-js serialises every auth call behind a single
  // lock - so a stuck getSession() is precisely when a sign-out is most
  // likely to land mid-flight. Without this guard, that hung call resolving
  // late would hand back the pre-sign-out session and silently sign the user
  // back into an account they had explicitly left.
  //
  // Must be reset on every path that legitimately establishes a new session,
  // or signing back in during the same app run would be ignored.
  const signedOutRef = useRef(false);

  const refreshConsentStatus = useCallback(async () => {
    // Must never throw: this runs during app startup (see the bootstrap
    // effect below), and an unhandled error here would previously prevent
    // setLoading(false) from running, leaving the app stuck on a blank
    // screen. On any failure (e.g. an expired token or offline), fall back
    // to not blocking on consent rather than crashing startup.
    try {
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
    } catch {
      setNeedsConsent(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // Whether the real getSession() call below has returned or thrown yet -
    // read by the soft/hard timers so they only act while it's still
    // in flight, and set before either branch below touches state so a
    // late resolution can tell it's no longer the freshest source of truth.
    let resolved = false;

    (async () => {
      // Read whatever session was last persisted, without touching the
      // network (see getPersistedSession) - this is what makes the
      // difference between "slow" and "signed out" below.
      const persistedReadStart = Date.now();
      const persisted = await getPersistedSession();
      logPersistedSessionReadDuration(Date.now() - persistedReadStart);

      if (persisted && mounted) {
        // Optimistic path (2026-07-25 fix): a persisted session - even one
        // whose access token has expired - lets the user straight into the
        // app immediately. The real getSession() call right below keeps
        // running in the background and corrects this once it settles,
        // instead of the previous behaviour of racing it against a 6s
        // timeout and signing the user out just because a refresh was
        // slow (a routine occurrence once the ~1hr access token has
        // expired and the device has a slow connection at cold start).
        setSession(persisted);
        setLoading(false);
      }

      const bootstrap = supabase.auth.getSession();

      // Telemetry only - fires purely because 6s elapsed with the real
      // call still in flight. Whether it ultimately succeeds or not isn't
      // known yet, so it must never itself change auth state.
      const softTimer = persisted
        ? setTimeout(() => {
            if (!resolved) {
              reportAuthHang(new Error("getSession still running after 6000ms"), "auth-bootstrap", "slow");
            }
          }, 6000)
        : null;

      // Telemetry only, same as the 6s soft timer - fires when the real
      // call is still stuck 45s in. Used to unconditionally give up and
      // force setSession(null) here, treating "never settles" as "device
      // is permanently offline." That's wrong: supabase-js's fetch has no
      // built-in timeout (see timeoutFetch in supabase.ts), so a stalled
      // request can hang this long on a device the OS reports as online -
      // it forced a real mid-session logout on 2026-07-26 while the user
      // was actively using the app. gotrue-js only signs the user out for
      // a conclusive decision it actually made (see the try/catch below);
      // this timer must stay just as inconclusive as that.
      const hardTimer = persisted
        ? setTimeout(() => {
            if (!resolved) {
              reportAuthHang(
                new Error("getSession never settled after 45000ms"),
                "auth-bootstrap",
                "timeout-fallback"
              );
            }
          }, 45000)
        : null;

      try {
        // No persisted session: __loadSession finds nothing in storage and
        // resolves immediately without any network call, so this timeout
        // is pure belt-and-braces - it should never actually fire here.
        // (A persisted session, by contrast, is awaited directly: letting
        // gotrue-js's own resolution - not our clock - decide the outcome
        // is the entire point of this fix.)
        const { data } = persisted
          ? await bootstrap
          : await withTimeout(bootstrap, 6000, "getSession");

        resolved = true;
        if (softTimer) clearTimeout(softTimer);
        if (hardTimer) clearTimeout(hardTimer);
        if (!mounted) return;

        // If the user signed out while this call was in flight, their tap is
        // newer information than this result and must win - see signedOutRef.
        if (signedOutRef.current) return;

        // gotrue-js only ever resolves session:null here for an outcome it
        // has actually decided - nothing was persisted, or a refresh that
        // genuinely, conclusively failed - never merely because this took
        // a while. Safe to trust directly, unlike our own timeout above.
        setSession(data.session);
        if (data.session) {
          // Consent check hanging must not sign the user out or block
          // first paint - on timeout just don't gate on consent this
          // launch (the onAuthStateChange listener re-checks on the next
          // auth event).
          await withTimeout(refreshConsentStatus(), 4000, "consent check").catch((err) => {
            reportAuthHang(err, "auth-bootstrap");
            if (mounted) setNeedsConsent(false);
          });
        }
      } catch (err) {
        resolved = true;
        if (softTimer) clearTimeout(softTimer);
        if (hardTimer) clearTimeout(hardTimer);
        if (!mounted) return;

        // Reachable here for two different reasons: (a) no persisted
        // session and our own 6s timeout fired - nothing was showing
        // anyway, so falling back to signed-out is free; or (b)
        // getSession() itself threw an unexpected error while a persisted
        // session's optimistic UI was already up - inconclusive (not the
        // "genuinely failed" signal gotrue-js normally returns in-band),
        // so it's reported but does NOT sign the user out.
        reportAuthHang(err, "auth-bootstrap", persisted ? "background-error" : "timeout-fallback");
        if (!persisted) setSession(null);
      } finally {
        // The persisted branch already cleared loading optimistically
        // above - only the no-persisted-session path needs it here.
        if (mounted && !persisted) setLoading(false);
      }
    })();

    // This callback MUST stay synchronous, and MUST NOT call any
    // supabase.auth.* method (or any PostgREST query) directly.
    //
    // auth-js awaits every subscriber callback from *inside* its own
    // initialisation, on the native cold-start path:
    //
    //   initialize()                      <- sets this.initializePromise
    //     _initialize()                   GoTrueClient.js:391
    //       _recoverAndRefresh()
    //         _callRefreshToken()
    //           await _notifyAllSubscribers('TOKEN_REFRESHED', session)  :4146
    //             await x.callback(event, session)                       :4208
    //
    // and getUser(), getSession(), signOut() and every PostgREST query
    // (via supabase-js's _getAccessToken -> getSession) all begin with
    // `await this.initializePromise` (:2595, :2334, :3320). So awaiting any
    // of them here waits on the promise that this callback is itself
    // blocking - a permanent deadlock. Nothing recovers it and no timeout
    // fires, because nothing is pending on a timer: they are promises that
    // will never settle. AUTH_FETCH_TIMEOUT_MS can't help either; the
    // deadlock is upstream of fetch.
    //
    // Observed 2026-07-28 21:07 on v43 (Sentry REACT-NATIVE-1/-2/-3): every
    // screen sat on a spinner, sign-out hung, getSession never settled at
    // 45s. Intermittent only because it needs this subscriber to be
    // registered by the time _recoverAndRefresh notifies - which happens
    // when the persisted access token has expired and the refresh network
    // call holds _initialize() open long enough for React to mount. A fresh
    // token notifies before mount and looks fine. That is the same failure
    // as the 2026-07-24 "expired overnight, cold start hung forever" note.
    //
    // setTimeout(0) is auth-js's own remedy for this: see the
    // _getSessionFromURL branch of _initialize() (:380), which defers its
    // notify exactly this way. ProContext's listener is already safe - it is
    // synchronous and fire-and-forgets. Keep both that way.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      // Same reasoning as the bootstrap guard above: a TOKEN_REFRESHED or
      // late INITIAL_SESSION carrying the old session must not undo an
      // explicit sign-out. A null session is always safe to apply.
      if (signedOutRef.current && s) return;
      setSession(s);
      if (s) {
        setTimeout(() => {
          // Re-check signedOutRef: this now runs a tick later, so a sign-out
          // can have landed in between, and refreshConsentStatus() would
          // otherwise re-gate a user who has already left.
          if (mounted && !signedOutRef.current) void refreshConsentStatus();
        }, 0);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshConsentStatus]);

  const signUp = async (email: string, password: string) => {
    // Clears the post-sign-out guard - see signedOutRef. Set before the call,
    // not after, so the onAuthStateChange this triggers isn't suppressed.
    signedOutRef.current = false;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    signedOutRef.current = false;
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
    signedOutRef.current = false;
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
    // Everything decisive happens BEFORE any network call.
    //
    // The user tapped "Log out" - that's an instruction, not a request, and
    // it must not depend on a server that may be unreachable. The previous
    // version put the local fallback behind `await signOut({scope:'local'})`
    // and only then called setSession(null). But auth-js serialises every
    // auth call behind one lock, so when a hung getSession() was holding it
    // that awaited fallback hung too - and the line that actually signed the
    // user out never ran. The safety net failed in exactly the situation it
    // existed for (Sentry REACT-NATIVE-1/-2, build 42, 2026-07-28: three
    // timeouts logged, user still signed in).
    signedOutRef.current = true;
    setSession(null);
    setNeedsConsent(false);
    // Not awaited, and deliberately not routed through auth-js: AsyncStorage
    // has no lock to queue behind, so this is the one clear that can't be
    // blocked. Without it a sign-out during a hang could leave the session on
    // disk for the next cold start to restore.
    void clearPersistedSession();

    try {
      // Still worth attempting: this is what revokes the refresh token
      // server-side, so the session can't be resumed elsewhere. Bounded,
      // because it can hang indefinitely (supabase-js ships no fetch timeout
      // of its own - see timeoutFetch in supabase.ts).
      const { error } = await withTimeout(supabase.auth.signOut(), 6000, "signOut");
      if (error) throw error;
    } catch (err) {
      // Diagnostic only now. The user is already signed out locally, so this
      // records that the server never confirmed it - the refresh token may
      // still be live until it expires on its own.
      reportAuthHang(err, "auth-signout", "local-fallback");
      // Fire-and-forget, for the same reason as clearPersistedSession above:
      // awaiting this is precisely what broke sign-out before.
      void supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }
  };

  // Password reset, code-based (not a magic-link deep link). resetPasswordForEmail
  // sends the recovery email; with the Supabase "Reset Password" template set to
  // include {{ .Token }}, the user gets a 6-digit code they type into the app.
  // This avoids deep-link/redirect plumbing entirely, which is far more reliable
  // on native. Note: Supabase intentionally does NOT error for an unknown email,
  // so this never discloses whether an account exists.
  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  };

  const confirmPasswordReset = async (email: string, token: string, newPassword: string) => {
    // verifyOtp(type: "recovery") exchanges the 6-digit code for a real session,
    // so the subsequent updateUser() is an authenticated call that sets the new
    // password. Once verifyOtp succeeds the user is effectively signed in, and
    // onAuthStateChange routes them into the app.
    //
    // Both calls are tagged with the stage they failed at (see authErrors.ts).
    // The distinction matters: once verifyOtp succeeds the person is signed in
    // and RootNavigator moves them on, so a later updateUser failure must not
    // be reported as "your reset failed" - it failed *after* they were let in,
    // with their old password still working.
    signedOutRef.current = false;
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "recovery",
    });
    if (verifyError) throw new PasswordResetError("verify", verifyError);

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw new PasswordResetError("update", updateError);
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, needsConsent, signUp, signIn, signInWithGoogle, signOut, requestPasswordReset, confirmPasswordReset, refreshConsentStatus }}
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
