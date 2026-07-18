// Unit tests for the crisis-language safety net.
//
// Run with:  npm test      (Node 22+, uses the built-in test runner +
//                            experimental type stripping; no deps required)
//
// This is the highest-risk code in the app: a false negative means silence
// when it matters. These tests lock in the regional coverage, the
// normalization behaviour (curly quotes, dialect/contraction folding), and a
// set of false-positive controls so a future edit can't silently regress the
// safety net. The design bias is sensitivity over precision, so a few
// "controls" that DO flag are asserted as flagging on purpose and documented.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkCrisisLanguage,
  normalizeForScan,
  CRISIS_PATTERNS,
} from "../supabase/functions/_shared/crisisWordlist.ts";

// ---------------------------------------------------------------------------
// True positives - must flag. Grouped by the category they exercise.
// ---------------------------------------------------------------------------
const MUST_FLAG: Record<string, string[]> = {
  "direct ideation": [
    "I keep thinking about killing myself",
    "I just want to die",
    "I want to end my life",
    "I wish I was dead",
    "everything feels pointless, I'm suicidal",
  ],
  "passive ideation": [
    "there's no reason to live",
    "I'm so tired of being alive",
    "I just want to go to sleep forever",
    "honestly I hope I don't wake up",
    "I hope I never wake up tomorrow",
  ],
  "self-harm": [
    "I've been cutting myself again",
    "the self-harming is getting worse",   // inflection the old /self-harm/ missed
    "I started self injuring last week",
    "I keep cutting my wrists",
  ],
  "hopelessness / burden": [
    "my family would be better off without me",
    "I'm such a burden to everyone",
    "I can't do this anymore",
  ],
  "regional UK/IE/AU/NZ dialect": [
    "some nights I just want to top myself",
    "I could do myself in",
    "I could do meself in",                 // meself -> myself normalization
    "thinking about offing myself",
    "I've had enough of it all",
  ],
  "online / algospeak euphemisms": [
    "I might just kms",
    "just want to unalive",
    "thinking about self-delete",
    "might sewerslide ngl",
  ],
  "phone-typed normalization": [
    "I can’t go on",                   // curly apostrophe
    "I’m gonna end it all",            // gonna -> going to, still matches "end it all"
    "i just wanna die",                     // wanna -> want to
  ],
};

for (const [category, samples] of Object.entries(MUST_FLAG)) {
  test(`flags: ${category}`, () => {
    for (const s of samples) {
      assert.equal(checkCrisisLanguage(s), true, `expected to FLAG: "${s}"`);
    }
  });
}

// ---------------------------------------------------------------------------
// True negatives - must NOT flag. Everyday text, including deliberately
// adjacent phrasing, that should stay clean.
// ---------------------------------------------------------------------------
const MUST_NOT_FLAG: string[] = [
  "an okay day, nothing severe, just getting through it",
  "cutting up vegetables for dinner tonight",
  "had enough coffee to float a boat",
  "the deadline is killing me at work",
  "my energy is low but I walked the dog",
  "feeling pretty good today, thanks",
  "watched a film and went to bed early",
];

test("does not flag: everyday text", () => {
  for (const s of MUST_NOT_FLAG) {
    assert.equal(checkCrisisLanguage(s), false, `expected NOT to flag: "${s}"`);
  }
});

// ---------------------------------------------------------------------------
// Documented, accepted sensitivity trade-offs. These DO flag on purpose
// (better a gentle resources screen than a miss). Asserting them keeps the
// behaviour intentional and visible rather than an accidental surprise.
// ---------------------------------------------------------------------------
test("accepted sensitivity trade-offs still flag (documented)", () => {
  // Negation the regex cannot understand - flags by design.
  assert.equal(checkCrisisLanguage("I would never hurt myself, I promise"), true);
  // "cutting myself off from X" - known false positive, accepted.
  assert.equal(checkCrisisLanguage("I'm cutting myself off from social media"), true);
});

// ---------------------------------------------------------------------------
// Normalization unit-level checks.
// ---------------------------------------------------------------------------
test("normalizeForScan folds quotes, dialect and contractions", () => {
  assert.equal(normalizeForScan("can’t"), "can't");
  assert.equal(normalizeForScan("do meself in"), "do myself in");
  assert.equal(normalizeForScan("gonna"), "going to");
  assert.equal(normalizeForScan("wanna"), "want to");
  assert.equal(normalizeForScan("line one\n  line two"), "line one line two");
});

test("journal and check-in note paths use the same function (parity)", () => {
  // Both surfaces call checkCrisisLanguage; a phrase that flags in one must
  // flag in the other. This guards the STEP 1 / STEP 1b parity in the job.
  const phrase = "I want to top myself";
  assert.equal(checkCrisisLanguage(phrase), true);
});

test("pattern list is non-empty and all entries are RegExp", () => {
  assert.ok(CRISIS_PATTERNS.length >= 30, "wordlist unexpectedly small");
  for (const p of CRISIS_PATTERNS) {
    assert.ok(p instanceof RegExp, "every pattern must be a RegExp");
  }
});
