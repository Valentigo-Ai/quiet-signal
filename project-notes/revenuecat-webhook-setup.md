# RevenueCat → Supabase webhook (server-side Pro enforcement)

Deployed 2026-07-19. Purpose: give the backend a local, always-current record
of who holds the "pro" entitlement, so edge functions can enforce Pro without
calling RevenueCat. RevenueCat remains the source of truth; the DB is a mirror.

## What was built (already live)

- **DB table** `public.user_entitlements` (migration `create_user_entitlements`).
  Keyed by `user_id` = `auth.users.id`. RLS on; owner can `select` their own row;
  no write policies, so only the service-role webhook can modify it.
  Columns: `is_pro`, `product_id`, `store`, `environment`, `expires_at`,
  `last_event_id`, `last_event_at`, `updated_at`.
- **Edge function** `revenuecat-webhook` (version 1, `verify_jwt=false`).
  Source: `supabase/functions/revenuecat-webhook/index.ts`.
  URL: `https://bzczbsrtbnqiydscvnak.supabase.co/functions/v1/revenuecat-webhook`
  Auth: shared secret in the `Authorization` header (not a Supabase JWT).
- **Client identity** wiring in `src/context/ProContext.tsx`:
  `Purchases.logIn(supabaseUserId)` on sign-in / restored session,
  `Purchases.logOut()` on sign-out. This makes RevenueCat's `app_user_id` equal
  the Supabase user id, which is what lets the webhook map events to accounts.
  **Ships in the next app build** — the backend is inert until a build with this
  change is on devices. (No migration of anonymous purchases needed: no real
  purchase has happened yet.)

## Remaining setup (manual — 3 steps)

### 1. Set the shared secret as a Supabase function secret
From the repo (WSL2 or PowerShell with supabase CLI logged in):

```
supabase secrets set REVENUECAT_WEBHOOK_SECRET='rcwh_a8a06b4a9c487833443b965e5b0f0ecb50ba23a7fdb27c24' --project-ref bzczbsrtbnqiydscvnak
```

(Or Supabase dashboard → Project Settings → Edge Functions → Secrets → add
`REVENUECAT_WEBHOOK_SECRET` with that value.) Until this is set, the function
returns 401 to everything — that's expected.

### 2. Add the webhook in the RevenueCat dashboard
RevenueCat → your project → Integrations → Webhooks → + New / Add:
- **URL:** `https://bzczbsrtbnqiydscvnak.supabase.co/functions/v1/revenuecat-webhook`
- **Authorization header value:** `rcwh_a8a06b4a9c487833443b965e5b0f0ecb50ba23a7fdb27c24`
  (paste the whole string exactly — the function compares the full header).
- Environment: send both Sandbox and Production.
- Save, then use **Send test event**. A `TEST` event returns
  `{ ok:true, skipped:"non-actionable: TEST" }` and shows 200 in RevenueCat —
  that confirms URL + secret are correct. (It won't write a row; only real
  purchase/renewal events for a signed-in user do.)

### 3. Ship the app build with the logIn change
Build a new internal-testing version (see main handover for the WSL2 build
flow) and install it. Then run the still-pending £3.99 purchase test on that
build — after purchase, a row should appear:

```
select user_id, is_pro, product_id, expires_at, last_event_at
from public.user_entitlements;
```

## Notes / future hardening
- **Record-only for now.** No edge function rejects non-Pro callers yet. When
  ready to actually enforce, add a check in e.g. `generate-message` that reads
  `user_entitlements.is_pro` for the caller and 403s if false. Do this only
  after confirming rows populate correctly for real purchases.
- Entitlement decisions are derived from the event payload (type +
  `expiration_at_ms`) with an ordering guard (`last_event_at`) and idempotency
  (`last_event_id`). If you ever need bullet-proof correctness against dropped/
  reordered events, upgrade the function to fetch the authoritative CustomerInfo
  from the RevenueCat REST API on each event (needs a RevenueCat secret API key).
- The secret above is also saved to nowhere else — rotate it by changing both
  the Supabase secret and the RevenueCat header value together.
