-- Seed the Google Play reviewer demo account with realistic data.
--
-- Target: reviewer@quietsignal.co.uk (b3ded684-f48b-4c0e-b183-8d58c8c10777)
--
-- Originally aimed at testuser123@example.com, which turned out to be a dead
-- end: the Supabase dashboard can't set a password on an existing user, only
-- send a recovery email, and @example.com is a reserved domain that cannot
-- receive mail. Created reviewer@quietsignal.co.uk instead, where the password
-- is set at creation time and recovery works if it's ever needed.
--
-- Why this exists: every testuser* account had zero check-ins, so a reviewer
-- signing in saw an empty app - no history, no trends, no PDF export, nothing
-- to assess the content rating or data safety declarations against.
--
-- Design constraints, deliberate:
--   * All scores 0-4, where 0 is the good end on every scale (see
--     src/constants/scaleLabels.ts). Data sits mostly in 1-3.
--   * No crisis-wordlist vocabulary anywhere in notes or journal entries. A
--     flagged entry in the reviewer's account would surface the crisis screen
--     out of context.
--   * Gentle improving trend across three weeks so the PDF summary has a real
--     direction to describe rather than noise.
--   * Days deliberately skipped (11, 17, 23) - a perfect unbroken run reads as
--     generated rather than lived.
--   * ptsd_score populated on most rows so the PDF's PTSD polyline clears its
--     >= 2 point threshold and the legend isn't advertising an empty chart.
--   * note_scanned_at / processed_at left NULL - the nightly 03:00 job picks
--     these up naturally. Not faking pipeline state.
--   * Today is left free so the reviewer can make their own check-in.
--
-- Idempotent: safe to re-run.

begin;

-- Surface the PTSD scale too, so the reviewer sees the full check-in screen
-- and the PDF chart has all four series.
-- Upsert rather than update: a freshly created account may have no profile row
-- yet, and an UPDATE would silently affect nothing. Consent and age_confirmed
-- matter as much as the check-in data - without them the reviewer is dropped
-- into the onboarding flow instead of the app.
insert into public.profiles (user_id, display_name, presenting_concerns, presenting_concerns_set, age_confirmed, consent_given_at, consent_version)
values ('b3ded684-f48b-4c0e-b183-8d58c8c10777','Alex',array['chronic_pain','anxiety','ptsd']::text[],true,true,now(),'2026-07-06-v2')
on conflict (user_id) do update
  set display_name = excluded.display_name,
      presenting_concerns = excluded.presenting_concerns,
      presenting_concerns_set = true,
      age_confirmed = true,
      consent_given_at = coalesce(public.profiles.consent_given_at, excluded.consent_given_at),
      consent_version = excluded.consent_version,
      updated_at = now();

insert into public.checkins (user_id, date, pain_score, anxiety_score, ptsd_score, energy_score, note)
values
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-07',3,3,2,3,'Rough night, back was bad. Managed a short walk anyway.'),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-08',3,2,2,3,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-09',2,2,1,2,'Physio exercises done. Slow, but something.'),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-10',3,3,2,3,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-12',2,2,1,2,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-13',2,1,1,2,'Better day. Slept through for once.'),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-14',3,2,2,3,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-15',2,2,2,2,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-16',2,1,1,1,'Got to the shop and back without needing to sit down.'),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-18',3,2,2,2,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-19',2,2,1,2,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-20',1,1,1,1,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-21',2,2,2,2,'Busy day, paid for it later. Need to pace better.'),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-22',2,1,1,1,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-24',1,1,0,1,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-25',2,2,1,2,null),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-26',1,1,1,1,'Good week overall. Trying to keep the walks up.'),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-27',1,1,0,1,null)
on conflict (user_id, date) do nothing;

-- NB: journal_entries has no unique (user_id, date) constraint - only a pkey on
-- id - so ON CONFLICT can't dedupe here. Guarded with NOT EXISTS instead, or a
-- re-run would silently double up every entry.
insert into public.journal_entries (user_id, date, entry_text)
select v.user_id, v.date, v.entry_text
from (values
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777'::uuid,'2026-07-09'::date,
   'Physio gave me a new set of stretches. The morning one is easier than the evening one, which is backwards from what I expected.'),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-16',
   'First proper walk in a while. Got to the corner shop and back without stopping. Small thing, but I will take it.'),
  ('b3ded684-f48b-4c0e-b183-8d58c8c10777','2026-07-26',
   'Looking back at the last few weeks the pattern is clearer. The bad days follow the days I try to do too much. Pacing, apparently, is the whole thing.')
) as v(user_id, date, entry_text)
where not exists (
  select 1 from public.journal_entries j
  where j.user_id = v.user_id and j.date = v.date
);

-- One recipient so the share flow isn't empty. Number is from Ofcom's
-- 07700 900xxx range, permanently reserved for fiction - it cannot ring anyone.
insert into public.recipients (user_id, recipient_label, contact_method, contact_value, full_history_access)
select 'b3ded684-f48b-4c0e-b183-8d58c8c10777','Dr Patel (GP)','sms','07700 900123',false
where not exists (
  select 1 from public.recipients
  where user_id = 'b3ded684-f48b-4c0e-b183-8d58c8c10777'
);

commit;
