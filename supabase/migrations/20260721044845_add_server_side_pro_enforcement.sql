-- Server-side mirror of the client Pro gates (FREE_MAX_RECIPIENTS = 1,
-- FREE_HISTORY_RANGES = [7, 30], PRO_ONLY_HISTORY_RANGES = [60, 90] in
-- src/context/ProContext.tsx). Until now, RLS only checked row ownership,
-- so any authenticated caller hitting the API directly (bypassing the app's
-- UI checks) could add unlimited recipients or read full history regardless
-- of tier. This closes that gap by checking public.user_entitlements
-- (written only by the revenuecat-webhook edge function) inside RLS.

-- Helper: is the given user currently entitled to Pro? Mirrors is_pro=true
-- from the RevenueCat webhook, plus an expires_at safety net in case an
-- EXPIRATION event is ever delayed or missed.
create or replace function public.is_pro(check_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_entitlements ue
    where ue.user_id = check_user_id
      and ue.is_pro = true
      and (ue.expires_at is null or ue.expires_at > now())
  );
$$;

-- 1) Recipients: free tier is capped at 1 recipient total.
drop policy if exists "recipients_insert_own" on public.recipients;
create policy "recipients_insert_own" on public.recipients
  for insert
  with check (
    (select auth.uid()) = user_id
    and (
      public.is_pro((select auth.uid()))
      or (select count(*) from public.recipients r where r.user_id = (select auth.uid())) < 1
    )
  );

-- 2) Recipients: defense-in-depth - a non-Pro caller can't grant a recipient
-- ongoing full_history_access via direct API call, even though no UI wires
-- this yet.
drop policy if exists "recipients_update_own" on public.recipients;
create policy "recipients_update_own" on public.recipients
  for update
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (public.is_pro((select auth.uid())) or full_history_access = false)
  );

-- 3) Checkins: free tier can only read the last 30 days (FREE_HISTORY_RANGES
-- tops out at 30; 60/90 are Pro-only). Retention itself is unchanged (still
-- 90 days for everyone, per checkin-archive-scan) - this only limits what a
-- non-Pro caller can SELECT.
drop policy if exists "checkins_select_own" on public.checkins;
create policy "checkins_select_own" on public.checkins
  for select
  using (
    (select auth.uid()) = user_id
    and (
      public.is_pro((select auth.uid()))
      or date >= (current_date - interval '30 days')
    )
  );
