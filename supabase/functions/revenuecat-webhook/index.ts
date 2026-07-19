// revenuecat-webhook
// PUBLIC endpoint that receives server-to-server events from RevenueCat and
// mirrors each user's "pro" entitlement into public.user_entitlements, so the
// backend can enforce Pro without calling RevenueCat (Section: server-side Pro
// enforcement). RevenueCat stays the source of truth; this is a local mirror.
//
// Auth model: this is NOT a Supabase-JWT endpoint (RevenueCat can't send one),
// so it is deployed with verify_jwt=false and instead checks a shared secret
// that RevenueCat sends in the Authorization header. Set the SAME value in:
//   - Supabase:    supabase secrets set REVENUECAT_WEBHOOK_SECRET=<value>
//   - RevenueCat:  Project > Integrations > Webhooks > Authorization header
// Requests without the matching header are rejected 401.
//
// Mapping: event.app_user_id must be the Supabase auth.users.id. That holds
// once the app calls Purchases.logIn(user.id) (see src/context/ProContext.tsx).
// Events whose app_user_id is anonymous ($RCAnonymousID:...) or not a UUID are
// acknowledged (200) and skipped - there is no account to attach them to.
//
// Writes use the service role (bypasses RLS). Ordering/idempotency: a row is
// only updated when the incoming event is newer than the last one stored, and
// duplicate deliveries of the same event id are ignored - RevenueCat retries.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const ENTITLEMENT_ID = "pro";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// RevenueCat event types we care about. Everything else (TEST, SUBSCRIBER_ALIAS,
// etc.) is acknowledged but not acted on.
type RcEvent = {
  id?: string;
  type?: string;
  app_user_id?: string;
  product_id?: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  environment?: string | null;
  store?: string | null;
  event_timestamp_ms?: number | null;
};

// Given an event, decide whether the "pro" entitlement should be active now.
function computeIsPro(type: string, expirationAtMs: number | null): boolean {
  const notExpired = expirationAtMs == null || expirationAtMs > Date.now();
  switch (type) {
    // Definitely no longer entitled.
    case "EXPIRATION":
    case "SUBSCRIPTION_PAUSED":
      return false;
    // Entitled as long as the current period hasn't lapsed. CANCELLATION only
    // means auto-renew was turned off - the user keeps Pro until expiry, when a
    // separate EXPIRATION event arrives. BILLING_ISSUE is a grace period.
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "NON_RENEWING_PURCHASE":
    case "SUBSCRIPTION_EXTENDED":
    case "CANCELLATION":
    case "BILLING_ISSUE":
    case "TRANSFER":
      return notExpired;
    default:
      return notExpired;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  // Shared-secret check. RevenueCat sends the exact string configured in its
  // webhook "Authorization" field; we compare against our stored secret.
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  const provided = req.headers.get("authorization") ?? "";
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
  }

  let event: RcEvent;
  try {
    const body = await req.json();
    event = body?.event ?? {};
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: jsonHeaders });
  }

  const type = event.type ?? "";
  const appUserId = event.app_user_id ?? "";

  // Acknowledge non-actionable events (RevenueCat's "Send test event", alias
  // bookkeeping, etc.) so RevenueCat marks delivery successful.
  const ACTIONABLE = new Set([
    "INITIAL_PURCHASE", "RENEWAL", "CANCELLATION", "UNCANCELLATION",
    "EXPIRATION", "BILLING_ISSUE", "PRODUCT_CHANGE", "NON_RENEWING_PURCHASE",
    "SUBSCRIPTION_PAUSED", "SUBSCRIPTION_EXTENDED", "TRANSFER",
  ]);
  if (!ACTIONABLE.has(type)) {
    return new Response(JSON.stringify({ ok: true, skipped: `non-actionable: ${type}` }), { headers: jsonHeaders });
  }

  // Only act on the "pro" entitlement. If the event carries an entitlement list
  // and "pro" isn't in it, there's nothing for us to mirror.
  const entIds = event.entitlement_ids ?? (event.entitlement_id ? [event.entitlement_id] : null);
  if (entIds && !entIds.includes(ENTITLEMENT_ID)) {
    return new Response(JSON.stringify({ ok: true, skipped: "not the pro entitlement" }), { headers: jsonHeaders });
  }

  // We can only attach entitlement to a real Supabase user. Anonymous RevenueCat
  // ids (pre-logIn) or anything that isn't a UUID get acknowledged and skipped.
  if (!UUID_RE.test(appUserId)) {
    return new Response(JSON.stringify({ ok: true, skipped: "app_user_id is not a Supabase user id" }), { headers: jsonHeaders });
  }

  const eventAtMs = event.event_timestamp_ms ?? Date.now();
  const eventAt = new Date(eventAtMs).toISOString();
  const isPro = computeIsPro(type, event.expiration_at_ms ?? null);
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Ordering + idempotency: skip if we've already stored this exact event, or a
  // newer one. RevenueCat can retry and can deliver slightly out of order.
  const { data: existing } = await supabase
    .from("user_entitlements")
    .select("last_event_id, last_event_at")
    .eq("user_id", appUserId)
    .maybeSingle();

  if (existing) {
    if (existing.last_event_id && existing.last_event_id === event.id) {
      return new Response(JSON.stringify({ ok: true, skipped: "duplicate event" }), { headers: jsonHeaders });
    }
    if (existing.last_event_at && new Date(existing.last_event_at).getTime() > eventAtMs) {
      return new Response(JSON.stringify({ ok: true, skipped: "stale event" }), { headers: jsonHeaders });
    }
  }

  const { error } = await supabase
    .from("user_entitlements")
    .upsert(
      {
        user_id: appUserId,
        is_pro: isPro,
        product_id: event.product_id ?? null,
        store: event.store ?? null,
        environment: event.environment ?? null,
        expires_at: expiresAt,
        last_event_id: event.id ?? null,
        last_event_at: eventAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    // FK violation (e.g. user deleted between purchase and webhook) is not worth
    // retrying - acknowledge it. Anything else, surface 500 so RevenueCat retries.
    if (error.code === "23503") {
      return new Response(JSON.stringify({ ok: true, skipped: "no such user" }), { headers: jsonHeaders });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeaders });
  }

  return new Response(JSON.stringify({ ok: true, user_id: appUserId, is_pro: isPro, type }), { headers: jsonHeaders });
});
