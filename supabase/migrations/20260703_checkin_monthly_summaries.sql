-- Quiet Signal: 90-day check-in archival
--
-- Monthly rollup table for check-ins older than the 90-day retention
-- window (Pro's max trends-view range). Raw daily check-ins get folded
-- into one row per user per month (numeric averages + theme tags from
-- that month's notes), then the daily rows are deleted by
-- checkin-archive-scan.
--
-- Retention is identical for free and Pro users - tier only ever gates
-- how far back the trends view lets you *look*, never how long raw
-- detail is *kept*. There's no reliable server-side Pro flag yet (real
-- payments aren't wired up - ProContext is still a client-side
-- placeholder), so a tier-aware retention policy isn't buildable
-- correctly today even if it were wanted.
--
-- Stored as running sums + counts (not a pre-computed average) so a
-- month can be summarized incrementally across multiple nightly runs -
-- e.g. March 1st crosses the 90-day mark on one run, March 2nd on the
-- next, and so on - and each run can merge into the same row rather
-- than overwrite it.
create table public.checkin_monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null, -- first day of the summarized calendar month
  days_logged int not null default 0,
  pain_sum int not null default 0,
  anxiety_sum int not null default 0,
  energy_sum int not null default 0,
  theme_counts jsonb not null default '{}', -- {"sleep": 5, "work": 3, ...} - cumulative across archival runs
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_start)
);
alter table public.checkin_monthly_summaries enable row level security;

create policy "checkin_monthly_summaries_select_own" on public.checkin_monthly_summaries
  for select using ((select auth.uid()) = user_id);
create policy "checkin_monthly_summaries_insert_own" on public.checkin_monthly_summaries
  for insert with check ((select auth.uid()) = user_id);
create policy "checkin_monthly_summaries_update_own" on public.checkin_monthly_summaries
  for update using ((select auth.uid()) = user_id);
create policy "checkin_monthly_summaries_delete_own" on public.checkin_monthly_summaries
  for delete using ((select auth.uid()) = user_id);

-- Schedule the nightly archival job. Reuses the same 'cron_secret'
-- already created in Vault for nightly-journal-scan (one shared secret,
-- checked independently by each function). After this migration, set
-- CRON_SECRET on the checkin-archive-scan edge function to that same
-- value: Dashboard > Edge Functions > checkin-archive-scan > Secrets, or
-- `supabase secrets set CRON_SECRET=...`.
select cron.schedule(
  'checkin-archive-scan',
  '15 3 * * *', -- 03:15 UTC daily, staggered 15 min after nightly-journal-scan
  $$
  select net.http_post(
    url := 'https://bzczbsrtbnqiydscvnak.supabase.co/functions/v1/checkin-archive-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
