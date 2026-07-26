-- "What are you dealing with?" became editable after onboarding (Settings ->
-- What you're tracking), which introduced an ambiguity the onboarding-only
-- flow never had: an empty presenting_concerns array used to mean only "this
-- person skipped the question", so CheckInScreen safely fell back to showing
-- the Anxiety block. Now it can also mean "this person went into Settings and
-- deliberately unticked everything" - and silently switching Anxiety back on
-- for them would be the app overriding a choice they just made.
--
-- This flag disambiguates the two. False (the default, and the value every
-- existing row gets) means "never explicitly answered" - keep the old
-- fallback. True means "this list is what they chose", and is honoured even
-- when the list is empty.
--
-- Onboarding sets it only when a non-empty selection was made, so skipping
-- the question behaves exactly as it always has. Any save from Settings sets
-- it to true unconditionally, because reaching that screen and pressing Save
-- is itself an explicit answer.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS presenting_concerns_set boolean NOT NULL DEFAULT false;

-- Existing users who did pick something during onboarding have already given
-- an explicit answer, so backfill them rather than leaving them on the
-- fallback path. Behaviourally a no-op today (a non-empty array already wins
-- either way), but it keeps the column's meaning honest for anything that
-- reads it later, and means a user who now unticks everything is correctly
-- treated as having answered.
UPDATE public.profiles
  SET presenting_concerns_set = true
  WHERE presenting_concerns IS NOT NULL
    AND array_length(presenting_concerns, 1) > 0;
