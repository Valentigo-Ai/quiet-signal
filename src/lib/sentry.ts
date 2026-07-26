import type { ComponentType } from "react";
import * as Sentry from "@sentry/react-native";

// Crash/error reporting (added 2026-07-23, after the cold-start white-screen
// incident shipped in v17 with zero on-device evidence to work from - Play
// Console vitals only see native crashes, not silent JS stalls).
//
// Privacy posture (this is a mental-health app - keep this minimal):
// - sendDefaultPii stays false (the default): no IP addresses, no user info.
// - tracesSampleRate 0: errors only - no performance tracing, no session
//   replay, no profiling. Nothing is sent unless something actually breaks.
// - Journal/check-in content never appears in errors as long as we never
//   console.log it or put it in thrown error messages (we don't).
// - Disabled entirely in dev builds so local work doesn't pollute the feed.
//
// The DSN is a publishable identifier (it only lets clients *submit* events
// to our project, not read anything), so it's fine to ship in the bundle.
// Org `valentigo`, project `react-native`, EU (Frankfurt) data region.
const SENTRY_DSN =
  "https://d326554a20120f1b062ed5b9f5f292f6@o4511783978205184.ingest.de.sentry.io/4511783985741904";

export function initSentry(): void {
  // Not configured yet (or deliberately unset) - no-op rather than throwing
  // during startup. Startup must never crash over telemetry.
  if (!SENTRY_DSN.startsWith("https://")) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

// Reports a hang/timeout somewhere in the auth flow (see AuthContext's
// withTimeout) - the class of bug that produces a silent blank screen (or,
// for sign-out, an unresponsive button) with no crash for Play vitals to
// see. PII-free: the error contains only our own timeout label. Originally
// bootstrap-only (hence the name staying close to that history), now also
// used by signOut() since supabase-js's fetch has the identical
// no-built-in-timeout vulnerability there.
// `outcome` optionally distinguishes what actually happened once the call
// settled - "slow" (still in flight, no decision made yet), "timeout-
// fallback" (bootstrap gave up waiting and forced a sign-out), "background-
// error" (bootstrap's background refresh threw but an optimistic session
// was already up, so no sign-out happened), or "local-fallback" (signOut()
// hung/failed and fell back to a local-only sign-out). Omit it for plain
// hang reports elsewhere (e.g. the consent-check timeout). Safe to call
// when Sentry is disabled (dev) - capture is simply a no-op.
export function reportAuthHang(
  err: unknown,
  area: "auth-bootstrap" | "auth-signout",
  outcome?: "slow" | "timeout-fallback" | "background-error" | "local-fallback"
): void {
  try {
    Sentry.captureException(
      err instanceof Error ? err : new Error(`${area} hang: unknown`),
      { tags: { area, ...(outcome ? { outcome } : {}) } }
    );
  } catch {
    // Telemetry must never break auth handling.
  }
}

// Wraps the root component so Sentry can catch render-phase errors above our
// own ErrorBoundary (which sits below the font gate in App.tsx - the exact
// blind spot the white-screen bug lived in).
export function wrapRoot<P extends Record<string, unknown>>(
  component: ComponentType<P>
): ComponentType<P> {
  return Sentry.wrap(component);
}

// Reports a failure to dismiss the splash screen - the other class of bug
// that produces the same symptom as reportAuthHang's bootstrap case above
// (silent blank/navy screen, no native crash for Play vitals to see), but on the splash
// side rather than auth-bootstrap: SplashScreen.hideAsync() itself throwing,
// on either the primary RootNavigator.onReady path or the App.tsx failsafe
// timer. callSite says which one, so the Sentry timeline can tell "hideAsync
// threw" apart from "onReady never fired at all" together with
// logSplashOnReady's breadcrumb below. PII-free: only our own label and call
// site. Safe to call when Sentry is disabled (dev) - capture is a no-op.
export function reportSplashHideFailure(
  err: unknown,
  callSite: "onReady" | "app-failsafe-12s"
): void {
  try {
    Sentry.captureException(
      err instanceof Error ? err : new Error(`splash hideAsync failed: unknown (${callSite})`),
      { tags: { area: "splash-dismiss", callSite } }
    );
  } catch {
    // Telemetry must never break startup handling.
  }
}

// Reports a Supabase data-layer failure - a PostgREST error (from
// supabase.from()/.rpc()), an auth-data error, or an edge function
// invocation error. Added 2026-07-26 after a shipped build's check-in
// screen wrote a column (ptsd_score) that didn't exist yet in the
// database: every save failed, History 400'd on every load, and Sentry
// recorded nothing, because every call site in this codebase handles
// failure with Alert.alert or an unchecked `error` - nothing throws, so
// nothing reported. This is the one place that wiring now goes through,
// same as reportAuthHang/reportSplashHideFailure are the one place for
// their categories - not a second parallel system.
//
// `area` identifies the call site (e.g. "checkin-save", "history-load"),
// matching how reportAuthHang uses its `area` tag. `code` (e.g. PGRST204
// for a schema mismatch, 42501 for an RLS refusal) is tagged rather than
// left in `extra` because it's exactly what you'd filter Sentry issues by
// to answer "is this the same failure recurring." `context` is for a call
// site's own non-sensitive detail (e.g. which table/action) - never pass
// the row payload itself through it.
//
// PII/health-data-free by construction: a PostgrestError's own
// code/message/details/hint describe the query or schema that failed
// (a missing column, a policy name, a constraint name), never the values
// that were being written - that's what this function extracts and
// nothing else. Do not add a raw `error` object or a request body to
// `context` upstream of this, since that could carry the payload with it.
type PostgrestLikeError = { code?: string; message?: string; details?: string; hint?: string };

export function reportDataError(
  error: unknown,
  area: string,
  context?: Record<string, string | number | boolean>
): void {
  try {
    const pg = (error ?? {}) as PostgrestLikeError;
    const message = pg.message ?? (error instanceof Error ? error.message : "unknown");
    Sentry.captureException(new Error(`data error (${area}): ${pg.code ?? "no-code"} ${message}`), {
      tags: { area, ...(pg.code ? { code: pg.code } : {}) },
      extra: {
        ...(pg.details ? { details: pg.details } : {}),
        ...(pg.hint ? { hint: pg.hint } : {}),
        ...(context ?? {}),
      },
    });
  } catch {
    // Telemetry must never break the caller's error handling.
  }
}

// Breadcrumb marking that RootNavigator's NavigationContainer onReady
// actually fired. On its own this reports nothing - it just gives a stuck-
// splash Sentry event (captured by the app-failsafe-12s report, or a later
// user-reported hang) a timeline to distinguish "onReady never fired" (no
// breadcrumb before the failsafe fires) from "onReady fired but hideAsync()
// threw" (breadcrumb present, followed by a splash-dismiss/onReady report).
export function logSplashOnReady(): void {
  try {
    Sentry.addBreadcrumb({ category: "splash-dismiss", message: "onReady fired", level: "info" });
  } catch {
    // Telemetry must never break startup handling.
  }
}
