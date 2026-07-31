import "react-native-url-polyfill/auto";
import { Platform, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type Session } from "@supabase/supabase-js";
import { reportDataError } from "@/lib/sentry";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in dev rather than silently hitting nothing.
  console.warn(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY - copy .env.example to .env"
  );
}

// Two classes of request, two very different needs, so one number can't
// serve both.
//
// Auth runs at cold start with the user watching a splash screen, and the
// Sentry evidence says its failures are bimodal rather than a slow tail:
// across builds 42 and earlier, `getSession still running after 6000ms`
// fired 4 times and `never settled after 45000ms` fired 6. If the network
// were merely slow there would be many of the former resolving before they
// became the latter - requests taking 8-15s and then succeeding. There
// aren't. Past ~6s these calls essentially never complete, so a shorter
// bound gives up on the same set of requests and just does it sooner.
//
// Everything else (PostgREST reads, and especially the generate-message
// edge function, which does real work per call) can legitimately take
// double figures, and cutting it to match auth would break working
// features to fix an unrelated one.
//
// 20000 was this file's original single value. It was chosen when the
// alternative was no timeout at all, where the only goal was "not forever"
// and the exact figure barely mattered. It's kept for non-auth requests on
// that basis and has no stronger evidence behind it than that.
const AUTH_FETCH_TIMEOUT_MS = 8000;
const FETCH_TIMEOUT_MS = 20000;

// supabase-js's fetch has no built-in timeout (see resolveFetch in
// @supabase/auth-js) - a stalled request (TCP connects, response never
// lands, which happens on flaky mobile wifi even while the OS reports
// "online") hangs every awaiting caller forever. Worse, auth-js
// single-flights token refreshes through one shared `refreshingDeferred`,
// so one stuck request wedges every subsequent refresh attempt too, not
// just the first. Wrapping fetch with an abortable timeout bounds every
// request the client makes so a stuck one fails fast and lets gotrue-js's
// own retry/error handling take over, instead of hanging the client
// permanently (see 2026-07-26 mid-session forced-logout incident).
function timeoutFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // GoTrue's endpoints all live under /auth/v1/ - matching on the URL is the
  // only signal available here, since supabase-js gives every subsystem the
  // same fetch and doesn't say which one is calling.
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const ms = url.includes("/auth/v1/") ? AUTH_FETCH_TIMEOUT_MS : FETCH_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On native, Google sign-in comes back through a custom URL scheme
    // handled manually in AuthContext (see signInWithGoogle) - detecting a
    // session from the URL doesn't apply there. On web there's no app
    // scheme to redirect to, so Google sends the browser straight back to
    // this same page with the session tokens in the URL - this flag is
    // what makes supabase-js pick those up automatically on load, which is
    // what the web branch of signInWithGoogle relies on.
    detectSessionInUrl: Platform.OS === "web",
  },
  global: {
    fetch: timeoutFetch,
  },
});

// Mirrors supabase-js's own default storage key (SupabaseClient constructor:
// `sb-${hostname.split('.')[0]}-auth-token`) so AuthContext can read
// whatever session was last persisted without going through getSession() -
// which, on an expired token, triggers a network refresh and can be slow.
// See getPersistedSession below.
const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl || "https://placeholder.supabase.co").hostname.split(".")[0]}-auth-token`;

function isSessionShaped(value: unknown): value is Session {
  return (
    typeof value === "object" &&
    value !== null &&
    "access_token" in value &&
    "refresh_token" in value &&
    "expires_at" in value
  );
}

// Reads the last session Supabase persisted to AsyncStorage, without ever
// touching the network - unlike getSession(), which refreshes an expired
// token before resolving and can hang on a slow connection (see
// AuthContext's bootstrap). Returned even if its access token has expired;
// callers decide whether "last known, possibly stale" is good enough to show
// optimistically while a real refresh runs in the background. Never throws -
// a missing or corrupted entry is just null, same as gotrue-js's own
// storage read.
export async function getPersistedSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSessionShaped(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Deletes the persisted session directly, bypassing gotrue entirely.
//
// Needed because every auth call - including signOut({scope:'local'}) -
// serialises behind auth-js's single lock, so when a request is stuck the
// one operation you most need (clearing the session) is exactly the one that
// can't run. AsyncStorage has no such lock. Without this, a sign-out tapped
// during a hang could leave the session on disk, and the next cold start
// would restore it and put the user back in an account they'd left.
//
// Never throws - this is a last-resort path and a failure here has no better
// fallback to escalate to.
export async function clearPersistedSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Intentionally swallowed - see above.
  }
}

// React Native requires wiring Supabase's token auto-refresh to the app's
// foreground/background state. `autoRefreshToken: true` above only arms the
// refresh timer - on mobile it must be explicitly started when the app is
// active and stopped when it's backgrounded (JS timers are unreliable in the
// background). Without this the ~1-hour access token silently expires while
// the app sits in the background, and the next resume can leave the client
// with a dead session - the root cause of the "white screen after a few
// hours" bug. Not needed on web, where the browser keeps the timer running.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
  // The app is active at launch, so start refreshing immediately rather than
  // waiting for the first foreground transition.
  supabase.auth.startAutoRefresh();
}

// Edge function helpers -----------------------------------------------------

export async function generateMessage(checkinId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-message", {
    body: { checkin_id: checkinId },
  });
  if (error) {
    // Reported here rather than at each call site so every current and
    // future caller of this helper is covered by one report, the same way
    // the throw itself already is.
    reportDataError(error, "generate-message");
    throw error;
  }
  return data.message as string;
}

export async function shareCheckin(params: {
  checkinId: string;
  recipientId: string;
  messageText: string;
}) {
  const { data, error } = await supabase.functions.invoke("share-checkin", {
    body: {
      checkin_id: params.checkinId,
      recipient_id: params.recipientId,
      message_text: params.messageText,
    },
  });
  if (error) {
    reportDataError(error, "share-checkin");
    throw error;
  }
  return data as { shared_message_id: string; view_url: string; delivery: unknown };
}

/**
 * Authoritative, server-side re-check of the caller's own "pro" entitlement
 * - see verify-entitlement's own doc comment for why this exists (a Google
 * Play refund issued outside RevenueCat can leave RevenueCat's own record,
 * and therefore the client's CustomerInfo, showing an entitlement as active
 * for a while). Called by ProContext right after a purchase or restore
 * succeeds, never as the sole gate on its own - see the null-return case.
 *
 * Returns `null` (rather than throwing) when the check itself couldn't run -
 * not configured yet, or a transient failure - so a legitimate customer is
 * never denied Pro because of an outage in this specific safety net. Errors
 * are still reported so the gap is visible.
 */
export async function verifyEntitlement(): Promise<boolean | null> {
  const { data, error } = await supabase.functions.invoke("verify-entitlement", { body: {} });
  if (error) {
    reportDataError(error, "verify-entitlement");
    return null;
  }
  return typeof data?.isPro === "boolean" ? data.isPro : null;
}
