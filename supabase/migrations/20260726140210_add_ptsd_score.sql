-- Splits the combined "Anxiety/PTSD" check-in dimension into two
-- independent, separately-selectable ones (see
-- WhatAreYouDealingWithScreen.tsx / profiles.presenting_concerns /
-- CheckInScreen.tsx). Unlike pain_score/anxiety_score, ptsd_score is
-- nullable and unconstrained by NOT NULL: it's only ever collected from
-- users who told us PTSD applies to them, so most check-ins - including
-- every one already logged - won't have a value.
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS ptsd_score smallint
    CHECK (ptsd_score IS NULL OR ptsd_score BETWEEN 0 AND 4);

-- Mirrors pain_sum/anxiety_sum/energy_sum for the monthly archive rollup
-- (checkin-archive-scan), but since ptsd_score is nullable and only
-- sometimes present, a plain sum divided by days_logged would understate
-- the average for users who do have it. ptsd_days tracks how many of a
-- month's archived days actually had a ptsd_score, so it can be divided out
-- correctly whenever this column is read (nothing reads
-- checkin_monthly_summaries yet, same as the other *_sum columns).
ALTER TABLE public.checkin_monthly_summaries
  ADD COLUMN IF NOT EXISTS ptsd_sum int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ptsd_days int NOT NULL DEFAULT 0;
