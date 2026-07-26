-- Regression fix: the free-tier 30-day cap added to checkins_select_own
-- (add_server_side_pro_enforcement) filters on `date`, but useCrisisCheck
-- (src/lib/useCrisisCheck.ts) relies on being able to see flagged_crisis
-- rows indefinitely until the person explicitly acknowledges them - that's
-- the whole point of "re-appears on every app open until dismissed" in the
-- July 2026 crisis-safety-net review. A flagged check-in that ages past 30
-- days unacknowledged would otherwise become invisible to a free user's own
-- safety check. Crisis visibility must never be subordinate to a monetization
-- limit - carve it out unconditionally.

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
