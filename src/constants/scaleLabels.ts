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
export const ENERGY_LABELS: [string, string, string, string, string] = [
  "Very low",
  "Low",
  "Okay",
  "Good",
  "Great",
];
