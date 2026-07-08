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
