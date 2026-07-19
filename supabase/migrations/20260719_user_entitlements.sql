-- Server-side record of each user's Pro entitlement, kept current by the
-- revenuecat-webhook edge function. RevenueCat remains the source of truth;
-- this table is the backend's local mirror so edge functions can enforce Pro
-- without calling out to RevenueCat. Keyed by auth.users.id, which equals the
-- RevenueCat app_user_id once the client calls Purchases.logIn(user.id).
create table if not exists public.user_entitlements (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  is_pro         boolean     not null default false,
  product_id     text,
  store          text,
  environment    text,
  expires_at     timestamptz,
  last_event_id  text,
  last_event_at  timestamptz,
  updated_at     timestamptz not null default now()
);

comment on table public.user_entitlements is
  'Backend mirror of RevenueCat Pro entitlement, written only by the revenuecat-webhook edge function (service role). RevenueCat is the source of truth.';

alter table public.user_entitlements enable row level security;

-- Owners may READ their own entitlement (lets the client cross-check server
-- state if desired). No insert/update/delete policies exist, so the anon/auth
-- roles can never write it; only the service-role webhook (which bypasses RLS)
-- may modify entitlement state.
drop policy if exists "own entitlement is readable by owner" on public.user_entitlements;
create policy "own entitlement is readable by owner"
  on public.user_entitlements
  for select
  using (auth.uid() = user_id);
