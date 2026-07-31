// verify-entitlement
// Authoritative, server-side re-check of the caller's own "pro" entitlement.
// Called by the app right after Purchases.restorePurchases() and
// Purchases.purchasePackage() succeed (see src/context/ProContext.tsx) - the
// two moments a stale or refunded record could otherwise still read as Pro.
//
// Why this exists (incident 2026-07-31): a Google Play subscription refunded
// directly via Play Console Order Management doesn't reach RevenueCat unless
// Google Play Real-time Developer Notifications (Pub/Sub) are wired up
// between Google Play and the RevenueCat project - a Google Cloud/RevenueCat
// dashboard setting, not something this function can fix by itself. Until
// that notification arrives (or never, if it isn't configured),
// RevenueCat's own subscriber record - and therefore the client SDK's local
// CustomerInfo, which only ever reflects what RevenueCat itself believes -
// can keep showing a refunded purchase as active. This function closes both
// gaps it actually can:
//   1. Re-fetches the subscriber from RevenueCat's REST API server-to-server
//      (Authorization: Bearer <secret key>, a credential the client never
//      has), instead of trusting whatever the client's own SDK call
//      returned - closes the "trust the client" vector outright.
//   2. If RevenueCat's own data still says active, cross-checks the specific
//      order directly against Google Play's Voided Purchases API - the one
//      record a Play refund cannot fail to update, independent of whether
//      RevenueCat has been notified yet. This is what catches a refund
//      RevenueCat itself doesn't know about.
// Step 2 requires Google Play API credentials (see secrets below). If they
// aren't configured, step 2 is skipped and this falls back to RevenueCat's
// own view alone - strictly no worse than before, just not complete yet.
//
// Auth model: standard Supabase JWT (verify_jwt: true, the project default -
// no config.toml override needed). The caller can only ever check their own
// entitlement, identified from their own token - same pattern as
// delete-account.
//
// Secrets required (supabase secrets set <NAME>=<value>):
//   REVENUECAT_SECRET_API_KEY        RevenueCat dashboard > Project settings
//                                     > API keys > Secret key (NOT the public
//                                     SDK key already used client-side).
//   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  Full JSON key for a Google Cloud service
//                                     account granted "View financial data"
//                                     for this app under Play Console >
//                                     Users and permissions. Optional - see
//                                     wasOrderVoided below.
//   ANDROID_PACKAGE_NAME              Optional, defaults to com.quietsignal.app
//                                     (see app.json).
//
// Writes: upserts public.user_entitlements with this call's own verdict,
// same shape/service-role pattern as revenuecat-webhook, so the mirror table
// reflects the authoritative result too - not just whatever the last webhook
// event happened to say. Only touches the columns listed here; last_event_id
// / last_event_at are left alone so this can never look like a webhook event
// to the webhook's own ordering/idempotency check.

import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@9";

const ENTITLEMENT_ID = "pro";
const DEFAULT_PACKAGE_NAME = "com.quietsignal.app";

type RcSubscription = {
  expires_date?: string | null;
  refunded_at?: string | null;
  store?: string | null;
  store_transaction_id?: string | null;
};

type RcSubscriber = {
  entitlements?: Record<string, { expires_date?: string | null; product_identifier?: string | null }>;
  subscriptions?: Record<string, RcSubscription>;
};

async function fetchRevenueCatSubscriber(userId: string, secretKey: string): Promise<RcSubscriber | null> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (res.status === 404) return null; // RevenueCat has never seen this user - definitely not pro.
  if (!res.ok) throw new Error(`RevenueCat API ${res.status}`);
  const body = await res.json();
  return body?.subscriber ?? null;
}

// Google's Voided Purchases API lists every refunded/revoked order in a time
// window, independent of whatever RevenueCat has or hasn't been told. We
// match by order id (store_transaction_id, e.g. "GPA.xxxx-xxxx-xxxx-xxxxx"),
// which is what RevenueCat's REST API actually exposes to us - not a raw
// purchase token, which RevenueCat's SDKs deliberately don't hand back to the
// client (they're the ones meant to validate it).
async function wasOrderVoided(orderId: string, packageName: string): Promise<boolean> {
  const saJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!saJson) return false; // Not configured yet - see doc comment above.

  const auth = new GoogleAuth({
    credentials: JSON.parse(saJson),
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) throw new Error("Could not obtain a Google access token");

  // A year back is generous - we don't know the original purchase date here,
  // and Google can report a void well after the fact.
  const startTimeMillis = Date.now() - 1000 * 60 * 60 * 24 * 365;
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}` +
    `/purchases/voidedpurchases?startTime=${startTimeMillis}&maxResults=1000`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${tokenResponse.token}` } });
  if (!res.ok) throw new Error(`Play Developer API ${res.status}`);
  const body = await res.json();
  const voided: Array<{ orderId?: string }> = body?.voidedPurchases ?? [];
  return voided.some((v) => v.orderId === orderId);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "not authenticated" }), { status: 401 });
    }
    const userId = userData.user.id;

    const rcSecretKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
    if (!rcSecretKey) {
      // Can't verify anything server-side yet. The caller (ProContext) treats
      // this as "verification unavailable" and falls back to its own
      // client-side read rather than denying a legitimate customer over our
      // own setup being incomplete.
      return new Response(JSON.stringify({ error: "not configured" }), { status: 503 });
    }

    const subscriber = await fetchRevenueCatSubscriber(userId, rcSecretKey);
    const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID];

    let isPro = false;
    let expiresAt: string | null = null;
    let productId: string | null = null;
    let store: string | null = null;

    if (entitlement) {
      const notExpired = !entitlement.expires_date || new Date(entitlement.expires_date).getTime() > Date.now();
      productId = entitlement.product_identifier ?? null;
      const sub = productId ? subscriber?.subscriptions?.[productId] : undefined;
      const notRefunded = !sub?.refunded_at;
      expiresAt = entitlement.expires_date ?? null;
      store = sub?.store ?? null;
      isPro = notExpired && notRefunded;

      // Still active per RevenueCat's own record - cross-check directly with
      // Google for the one gap RevenueCat's own data can't see on its own: a
      // refund it was never notified about.
      if (isPro && store === "PLAY_STORE" && sub?.store_transaction_id) {
        try {
          const packageName = Deno.env.get("ANDROID_PACKAGE_NAME") ?? DEFAULT_PACKAGE_NAME;
          if (await wasOrderVoided(sub.store_transaction_id, packageName)) {
            isPro = false;
          }
        } catch (e) {
          // Google check failed (credentials not configured yet, or a
          // transient API error) - don't let that deny a legitimate
          // customer; fall back to RevenueCat's own already-checked view.
          console.warn("[verify-entitlement] Google Play voided-purchase check failed:", e);
        }
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: upsertError } = await supabase.from("user_entitlements").upsert(
      {
        user_id: userId,
        is_pro: isPro,
        product_id: productId,
        store,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upsertError) console.warn("[verify-entitlement] failed to update mirror:", upsertError.message);

    return new Response(JSON.stringify({ isPro }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
