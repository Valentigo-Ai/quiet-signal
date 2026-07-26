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

// Reports a startup hang/timeout (see AuthContext's withTimeout) - the class
// of bug that produces a silent blank screen with no crash for Play vitals
// to see. PII-free: the error contains only our own timeout label.
// `outcome` optionally distinguishes what actually happened once a slow
// auth-bootstrap settled - "slow" (still in flight, no decision made yet),
// "timeout-fallback" (we gave up waiting and forced a sign-out), or
// "background-error" (the background refresh threw but an optimistic
// session was already up, so no sign-out happened). Omit it for plain
// startup-hang reports elsewhere (e.g. the consent-check timeout). Safe to
// call when Sentry is disabled (dev) - capture is simply a no-op.
export function reportStartupHang(
  err: unknown,
  outcome?: "slow" | "timeout-fallback" | "background-error"
): void {
  try {
    Sentry.captureException(
      err instanceof Error ? err : new Error("startup hang: unknown"),
      { tags: { area: "auth-bootstrap", ...(outcome ? { outcome } : {}) } }
    );
  } catch {
    // Telemetry must never break startup handling.
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
// that produces the same symptom as reportStartupHang above (silent blank/
// navy screen, no native crash for Play vitals to see), but on the splash
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

// Reports a failed read in useCrisisCheck (journal_entries/checkins query
// for an unacknowledged flagged_crisis row). This gates whether the
// auto-surfaced Crisis Resources screen appears on app open, so a silently
// swallowed error here is a safety-net gap, not just a UX bug - the caller
// must treat any report from this function as "uncertain, so show the
// screen" rather than "no flag found". PII-free: PostgrestError messages
// describe the query/schema, never row content. Safe to call when Sentry is
// disabled (dev) - capture is a no-op.
export function reportCrisisCheckError(err: unknown, source: "journal" | "checkins"): void {
  try {
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
    Sentry.captureException(new Error(`crisis check query failed: ${message ?? "unknown"}`), {
      tags: { area: "crisis-check", source },
    });
  } catch {
    // Telemetry must never break the crisis safety check.
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
