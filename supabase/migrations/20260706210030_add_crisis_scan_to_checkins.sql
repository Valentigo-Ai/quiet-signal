-- Crisis-language safety net extension (July 2026 safety review, finding 1):
-- check-in notes were never scanned; only journal entries were. Adds the
-- columns the nightly scan needs. Additive and nullable-safe: existing rows
-- get flagged_crisis=false and note_scanned_at=null (null = not yet scanned;
-- rows with no note are marked scanned by the job without pattern-matching).
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS flagged_crisis boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS note_scanned_at timestamptz;
