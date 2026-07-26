-- The July 2026 split (commit 0bc60196) replaced onboarding's three keys
-- (chronic_pain / ptsd_anxiety / both) with two independent ones
-- (chronic_pain / anxiety / ptsd), but never rewrote values already
-- persisted under the old keys. CheckInScreen checks for "anxiety" and
-- "ptsd" literally, so a profile still holding ["both"] or ["ptsd_anxiety"]
-- matches neither - the split silently stopped asking about both
-- dimensions for every pre-split user (11 of 14 production profiles),
-- with nothing on screen to show it had happened.
--
-- Mapping: "both" meant "chronic pain and PTSD/anxiety", and the old
-- combined check-in scale's data lives in what is now anxiety_score (see
-- the same commit), so:
--   "both"         -> chronic_pain + anxiety
--   "ptsd_anxiety" -> anxiety
--
-- Deliberately NOT adding "ptsd" for these users: it would start asking
-- them a brand-new daily question, in wording they've never seen (Grounded
-- / A little on alert / Keyed up / Triggered / Flooded), that they never
-- opted into. For a population that includes people with PTSD, unilaterally
-- springing a new daily trauma-response question on someone is not a small
-- thing to do without asking. They can add it themselves, any time, from
-- Settings -> "What you're tracking" (WhatYoureTrackingScreen) - exactly
-- what that screen exists for.
--
-- Idempotent and additive-only: chronic_pain is preserved where already
-- present, "both"/"ptsd_anxiety" are removed, "anxiety"/"chronic_pain" are
-- only added if not already there (DISTINCT, no duplicate entries), and
-- rows already on current keys (or with no presenting_concerns at all) are
-- untouched - the WHERE clause only matches rows still holding a legacy key,
-- so a second run of this migration is a no-op.
UPDATE public.profiles
SET presenting_concerns = (
  SELECT array_agg(DISTINCT c ORDER BY c)
  FROM unnest(
    array_remove(array_remove(presenting_concerns, 'both'), 'ptsd_anxiety')
    || CASE WHEN 'both' = ANY(presenting_concerns) THEN ARRAY['chronic_pain', 'anxiety'] ELSE ARRAY[]::text[] END
    || CASE WHEN 'ptsd_anxiety' = ANY(presenting_concerns) THEN ARRAY['anxiety'] ELSE ARRAY[]::text[] END
  ) AS c
)
WHERE presenting_concerns && ARRAY['both', 'ptsd_anxiety'];
