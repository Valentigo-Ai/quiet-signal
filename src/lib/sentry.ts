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

// Wraps the root component so Sentry can catch render-phase errors above our
// own ErrorBoundary (which sits below the font gate in App.tsx - the exact
// blind spot the white-screen bug lived in).
export function wrapRoot<P extends Record<string, unknown>>(
  component: ComponentType<P>
): ComponentType<P> {
  return Sentry.wrap(component);
}
