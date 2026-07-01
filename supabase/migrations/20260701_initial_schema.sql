-- Quiet Signal initial schema
create extension if not exists "pgcrypto";

-- 1. profiles ---------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  presenting_concerns text[] not null default '{}', -- e.g. {chronic_pain, ptsd_anxiety, other} - never shown to recipients
  presenting_concerns_other text,
  age_confirmed boolean not null default false, -- 18+ gate, Section 11.1
  consent_given_at timestamptz, -- specific health-data consent, Section 11.1
  consent_version text,
  checkin_reminder_time time, -- notification prefs
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

-- 2. recipients ---------------------------------------------------------
create table public.recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_label text not null, -- user-chosen label e.g. "Mum", "Partner"
  contact_method text not null check (contact_method in ('push','sms')),
  contact_value text not null, -- push token or phone number
  full_history_access boolean not null default false, -- ongoing access granted explicitly
  created_at timestamptz not null default now()
);
alter table public.recipients enable row level security;

create policy "recipients_select_own" on public.recipients
  for select using (auth.uid() = user_id);
create policy "recipients_insert_own" on public.recipients
  for insert with check (auth.uid() = user_id);
create policy "recipients_update_own" on public.recipients
  for update using (auth.uid() = user_id);
create policy "recipients_delete_own" on public.recipients
  for delete using (auth.uid() = user_id);

-- 3. checkins ---------------------------------------------------------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  pain_score smallint not null check (pain_score between 0 and 4),
  anxiety_score smallint not null check (anxiety_score between 0 and 4),
  energy_score smallint not null check (energy_score between 0 and 4),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.checkins enable row level security;

create policy "checkins_select_own" on public.checkins
  for select using (auth.uid() = user_id);
create policy "checkins_insert_own" on public.checkins
  for insert with check (auth.uid() = user_id);
create policy "checkins_update_own" on public.checkins
  for update using (auth.uid() = user_id);
create policy "checkins_delete_own" on public.checkins
  for delete using (auth.uid() = user_id);

-- 4. shared_messages ---------------------------------------------------------
-- Recipients never read raw checkins/journal tables directly. They only ever
-- see the specific generated message via a one-time/ongoing token, resolved
-- by a service-role edge function (get-shared-message).
create table public.shared_messages (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  recipient_id uuid not null references public.recipients(id) on delete cascade,
  message_text text not null,
  view_token uuid not null default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  viewed_at timestamptz
);
alter table public.shared_messages enable row level security;

-- Only the sender (owner of the underlying checkin) may read/write via the
-- authenticated client. The public recipient view is served by a
-- service-role edge function using view_token, which bypasses RLS by design.
create policy "shared_messages_select_owner" on public.shared_messages
  for select using (
    exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = auth.uid())
  );
create policy "shared_messages_insert_owner" on public.shared_messages
  for insert with check (
    exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = auth.uid())
  );
create policy "shared_messages_delete_owner" on public.shared_messages
  for delete using (
    exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = auth.uid())
  );

-- 5. journal_entries ---------------------------------------------------------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  entry_text text not null,
  sentiment_score numeric,
  flagged_crisis boolean not null default false, -- set by nightly safety-check job
  excluded_from_insights boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.journal_entries enable row level security;

create policy "journal_entries_select_own" on public.journal_entries
  for select using (auth.uid() = user_id);
create policy "journal_entries_insert_own" on public.journal_entries
  for insert with check (auth.uid() = user_id);
create policy "journal_entries_update_own" on public.journal_entries
  for update using (auth.uid() = user_id);
create policy "journal_entries_delete_own" on public.journal_entries
  for delete using (auth.uid() = user_id);

-- 6. journal_insights ---------------------------------------------------------
create table public.journal_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  themes text[] not null default '{}',
  correlations jsonb not null default '{}',
  summary_text text, -- always framed as reflection aid, never clinical (Section 11.4)
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);
alter table public.journal_insights enable row level security;

create policy "journal_insights_select_own" on public.journal_insights
  for select using (auth.uid() = user_id);
create policy "journal_insights_insert_own" on public.journal_insights
  for insert with check (auth.uid() = user_id);
create policy "journal_insights_delete_own" on public.journal_insights
  for delete using (auth.uid() = user_id);

-- 7. helper: full data-export view is just a matter of selecting from the
-- above per-user; delete-account cascades via FK on auth.users delete.
