// Single source of truth for the 0-4 tap-scale labels used on the check-in
// screen (ScaleInput). Also reused anywhere a check-in score needs to read
// as words instead of a raw number - e.g. the History "Share a summary" text
// and PDF export - so a shared/exported score always says the exact same
// thing the person actually tapped, and a future wording change (like
// Moderate -> Medium) can't drift out of sync between screens.
//
// Wording is also constrained by layout, which isn't obvious from reading the
// strings alone. Five pills share the screen width on the check-in scale, and
// a single unbroken word longer than roughly 7 characters won't fit one at the
// base font size - ScaleInput then shrinks the WHOLE row so the five options
// stay visually equal, which makes that row noticeably smaller than the
// others. Multi-word labels are free: they wrap at their spaces, so "A little
// on edge" (16 characters) costs nothing while "Overwhelmed" (11, unbroken)
// forced the entire Anxiety row down a size. Prefer short single words or
// short phrases; avoid long single words. See ScaleInput.tsx.
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
  // Was "Overwhelmed" until July 2026. Same meaning, but 11 unbroken
  // characters shrank the whole Anxiety row; "At my limit" wraps at its
  // spaces and reads as something a person would say about themselves.
  "At my limit",
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
//
// "Grounded" -> "Steady" and "Overloaded" -> "Too much" (July 2026) for the
// layout reason at the top of this file. "Triggered" is deliberately kept
// despite being 9 unbroken characters: it's the term people with PTSD
// actually use, and the alternatives that would fit ("Set off") lose that
// recognition. The row therefore settles slightly below the base font size,
// but uniformly across all five options rather than one shrunken outlier.
export const PTSD_LABELS: [string, string, string, string, string] = [
  "Steady",
  "A little on alert",
  "On edge",
  "Triggered",
  "Too much",
];
// 0 = Great, 4 = Very low - matches PAIN_LABELS/ANXIETY_LABELS where 4 is
// always "the concerning end" (Severe, At my limit). Energy used to run the
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
