// Single source of truth for the 0-4 tap-scale labels used on the check-in
// screen (ScaleInput). Also reused anywhere a check-in score needs to read
// as words instead of a raw number - e.g. the History "Share a summary" text
// and PDF export - so a shared/exported score always says the exact same
// thing the person actually tapped, and a future wording change (like
// Moderate -> Medium) can't drift out of sync between screens.
export const PAIN_LABELS: [string, string, string, string, string] = [
  "None",
  "Mild",
  "Medium",
  "High",
  "Severe",
];
export const ANXIETY_LABELS: [string, string, string, string, string] = [
  "Calm",
  "A little on edge",
  "Anxious",
  "Very anxious",
  "Overwhelmed",
];
// Split out from the combined "Anxiety/PTSD" scale (July 2026) into its own
// optional dimension - see WhatAreYouDealingWithScreen.tsx and
// profiles.presenting_concerns. PTSD's check-in question is about
// hyperarousal/trauma-response intensity, not general worry, so this isn't
// just a copy of ANXIETY_LABELS. "On edge" (level 2) deliberately echoes
// Anxiety's "A little on edge" (level 1) more than the original wording did -
// "Keyed up" and "Flooded" tested as confusing/unclear (Richard's July 2026
// feedback) and were replaced with plainer words, accepting the small
// cross-dimension overlap in exchange for clarity.
export const PTSD_LABELS: [string, string, string, string, string] = [
  "Grounded",
  "A little on alert",
  "On edge",
  "Triggered",
  "Overloaded",
];
// 0 = Great, 4 = Very low - matches PAIN_LABELS/ANXIETY_LABELS where 4 is
// always "the concerning end" (Severe, Overwhelmed). Energy used to run the
// other way (4 = Great) since it measures a good thing rather than a bad
// one, but that meant a rising number was good news for Energy and bad news
// for everything else - confusing for trend wording and charts. Flipped
// (July 2026) to keep all three scores pointing the same direction; every
// existing check-in's energy_score was migrated in the same session
// (see Supabase migration flip_energy_score_direction) so old and new data
// mean the same thing.
export const ENERGY_LABELS: [string, string, string, string, string] = [
  "Great",
  "Good",
  "Okay",
  "Low",
  "Very low",
];
