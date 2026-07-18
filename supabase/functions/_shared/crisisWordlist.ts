// Shared crisis-language wordlist + normalizer.
//
// SINGLE SOURCE OF TRUTH. Previously this list lived only inside
// nightly-journal-scan; it now lives here so every scan path (journal
// entries, check-in notes, and any future save-time check) uses ONE list
// that gets reviewed once. See docs/crisis-wordlist-review.md.
//
// ── SAFETY REVIEW: HELD (Samaritans, July 2026) ────────────────────────
// The professional safety review that gated launch (spec Section 4.5) has
// taken place: reviewed with Samaritans' Online Safety team via their free
// Online Harms Advisory Service. Their guidance was received and acted on
// (see docs/crisis-wordlist-review.md) - including the steer that scan
// timing is a judgment call for a private, non-crisis-service journal, so
// nightly-plus-signpost is a defensible posture. This file is still the
// mechanism, not a guarantee: keep it under review, and re-consult
// Samaritans if the response model changes materially.
//
// ── DESIGN BIAS: SENSITIVITY OVER PRECISION ────────────────────────────
// A false positive costs the user a gentle resources screen; a false
// negative costs silence when it matters. When unsure, we include.
//
// ── REGIONAL COVERAGE (July 2026) ──────────────────────────────────────
// Quiet Signal ships in six English-speaking countries (US, GB, CA, AU,
// NZ, IE). This is NOT a translation problem — it is regional idiom. Every
// pattern below is applied to EVERY user regardless of their detected
// country: locale detection can be wrong (default is US), users travel,
// and people mix regional phrasings. Gating each user to only their
// country's terms would introduce false negatives, against our bias. The
// country tags in comments are for reviewer organisation only — they do
// NOT restrict where a pattern applies.
//
// IMPORTANT: all patterns are matched against NORMALIZED text (see
// normalizeForScan). Any new pattern must be written against normalized
// output: straight quotes only, collapsed whitespace, and with "meself"→
// "myself" / "gonna"→"going to" / "wanna"→"want to" already applied.

export const CRISIS_PATTERNS: RegExp[] = [
  // ─────────────────────────────────────────────────────────────────────
  // CORE — direct ideation (universal English)
  // ─────────────────────────────────────────────────────────────────────
  /\bkill(ing)? myself\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend it all\b/i,
  /\bend(ing)? my (own )?life\b/i,
  /\bwant(ed|ing)? to die\b/i,
  /\bwish I (was|were) dead\b/i,
  /\bready to die\b/i,
  /\bplan to (die|end it)\b/i,
  /\bthinking about ending (it|my life)\b/i,

  // CORE — passive ideation
  /\bno reason to live\b/i,
  /\bno point (in )?living\b/i,
  /\bwish I (wasn'?t|weren'?t) here\b/i,
  /\btired of (living|being alive)\b/i,
  /\bdon'?t want to (be here|exist|wake up)( anymore)?\b/i,
  /\b(hope|wish) I (don'?t|never) wake up\b/i,
  /\bsleep forever\b/i,
  /\bwant it to (be over|stop)\b/i,

  // CORE — self-harm
  /\bself[\s-]?harm(ing|ed|s)?\b/i, // was /self-harm/ only — now matches "self-harming", "selfharmed"
  /\bself[\s-]?injur(e|es|ed|ing|y|ious)\b/i, // clinical term, common in US/CA
  /\bhurt(ing)? myself\b/i,
  /\bharm(ing)? myself\b/i,
  /\bcut(ting)? myself\b/i,
  /\bcut(ting)? my (wrists?|arms?|thighs?|legs?|skin)\b/i, // lower-FP anchored "cutting"
  /\bburn(ing)? myself\b/i,
  /\bstarv(e|ing) myself\b/i,

  // CORE — hopelessness / burden / farewell
  /\bnot (worth|going to) (be here|make it)\b/i,
  /\bbetter off (dead|without me)\b/i,
  /\bcan'?t (go on|do this anymore|take (it|this) anymore)\b/i,
  /\bgive up on (everything|life)\b/i,
  /\bno way out\b/i,
  /\bI'?m (such )?a burden\b/i,
  /\bwon'?t be (here|around) (much longer|for long)\b/i,
  /\bgoodbye (forever|for good)\b/i,
  /\beveryone('s| is) better off without me\b/i,

  // ─────────────────────────────────────────────────────────────────────
  // REGIONAL — UK / Ireland / Australia / NZ dialect euphemisms
  // "top myself" and "do myself in" are the most common non-clinical ways
  // of expressing suicidal intent across GB/IE/AU/NZ and were entirely
  // absent from the core list. (Also caught for US users — see header.)
  // ─────────────────────────────────────────────────────────────────────
  /\btop(ping)? myself\b/i, // GB/IE/AU/NZ — "I'm going to top myself"
  /\bdo(ing)? myself in\b/i, // GB/IE/AU/NZ — "I could do myself in"
  /\boff(ing)? myself\b/i, // GB/AU + online — "thinking of offing myself"
  /\bhad enough of (it all|living|life|this life)\b/i, // anchored, not bare "had enough"
  /\bwant(ed|ing)? this (all )?to end\b/i,

  // ─────────────────────────────────────────────────────────────────────
  // REGIONAL — North American / online algospeak euphemisms
  // Younger users routinely use platform-safe euphemisms in place of the
  // clinical words. "unalive"/"kms" were already present; these extend it.
  // ─────────────────────────────────────────────────────────────────────
  /\bkms\b/i, // "kill myself"
  /\bkys\b/i, // "kill yourself" — self-directed in a private journal
  /\bunalive\b/i,
  /\bself[\s-]?delet(e|es|ed|ing|ion)\b/i, // algospeak for suicide
  /\bsewer\s?slide\b/i, // algospeak homophone of "suicide"
  /\boverdos(e|ing|ed)\b/i,
];

// Normalize before matching. Rationale:
//  - iOS/Android keyboards insert curly quotes (can't vs can't), which
//    silently broke every apostrophe pattern for phone-typed entries — the
//    app's primary input source.
//  - Collapse whitespace so line breaks inside a phrase still match.
//  - Fold common regional/casual contractions so one pattern covers many
//    surface forms: "meself"→"myself" (GB/IE/AU dialect), and
//    "gonna/wanna/gotta" → expanded, so casual phone text still matches.
export function normalizeForScan(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\bmeself\b/gi, "myself")
    .replace(/\bgonna\b/gi, "going to")
    .replace(/\bwanna\b/gi, "want to")
    .replace(/\bgotta\b/gi, "got to")
    .replace(/\s+/g, " ");
}

export function checkCrisisLanguage(text: string): boolean {
  const normalized = normalizeForScan(text);
  return CRISIS_PATTERNS.some((p) => p.test(normalized));
}
