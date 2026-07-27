-- Security fix: the live "checkins_select_own" policy had diverged from
-- 20260721050216_crisis_flag_always_visible_regardless_of_tier.sql - the
-- deployed USING clause was
--   (owner AND flagged_crisis) OR is_pro(uid) OR (date >= now() - 30 days)
-- instead of the committed
--   owner AND (flagged_crisis OR is_pro(uid) OR date >= now() - 30 days)
-- Operator precedence means AND binds tighter than OR, so in the deployed
-- version the ownership check only applied to the crisis clause: any
-- authenticated user could read any other user's check-ins from the last
-- 30 days (pain/anxiety/PTSD scores, notes), and any pro user could read
-- every user's check-ins outright. No migration in this repo produced that
-- version - it was applied out-of-band. This restores the file's original,
-- correctly-scoped policy verbatim; no schema or data change.
drop policy if exists "checkins_select_own" on public.checkins;
create policy "checkins_select_own" on public.checkins
  for select
  using (
    (select auth.uid()) = user_id
    and (
      flagged_crisis = true
      or public.is_pro((select auth.uid()))
      or date >= (current_date - interval '30 days')
    )
  );
