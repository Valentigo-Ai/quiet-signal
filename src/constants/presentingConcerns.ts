// Single source of truth for the "What are you dealing with?" options, shared
// by the onboarding screen (WhatAreYouDealingWithScreen) and the Settings
// editor (WhatYoureTrackingScreen). These keys are persisted verbatim into
// profiles.presenting_concerns and read back by CheckInScreen to decide which
// optional check-in blocks to show, so they must not be renamed without a
// migration - the labels are free to change, the keys are not.
//
// "Anxiety" and "PTSD" are independent, separately-selectable options rather
// than a combined "PTSD / anxiety" plus a "Both" choice (July 2026 split):
// with real checkboxes, ticking both individual boxes already covers "both",
// so a third option for it would be redundant.
export const PRESENTING_CONCERN_OPTIONS: { key: string; label: string }[] = [
  { key: "chronic_pain", label: "Chronic pain" },
  { key: "anxiety", label: "Anxiety" },
  { key: "ptsd", label: "PTSD" },
];

// Shown under the heading on both screens. Worth keeping identical in each
// place: the reassurance that this is optional and never shared matters just
// as much when someone is revisiting the choice as when they first make it.
export const PRESENTING_CONCERNS_BLURB =
  "Totally optional. This just helps us use the right words for you - it's never shown to anyone you share with.";
