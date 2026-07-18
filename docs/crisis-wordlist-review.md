# Crisis-language safety net — engineering review (July 2026)

**Status: the professional clinical/safety review remains SHIP-BLOCKING.** This
document is preparation for that review, not a replacement for it. It reviews
the mechanism end-to-end (`supabase/functions/nightly-journal-scan/index.ts`
plus the client-side `src/lib/useCrisisCheck.ts`), records what was fixed in
the July 2026 engineering pass, and lists the open questions a qualified
reviewer needs to decide.

## How the safety net works today

1. A nightly cron job scans every unprocessed journal entry against a regex
   wordlist (`CRISIS_PATTERNS`).
2. A flagged entry is (a) excluded from all insight/theme generation and
   (b) marked `flagged_crisis`.
3. On next app open, `useCrisisCheck` sees the flag and gently auto-opens the
   Crisis Resources screen (signposting only — the app never attempts to
   respond to or assess a crisis, consistent with the consent screen, ToS,
   and the app's non-medical-device posture).

The failure-direction bias is deliberate: **a false positive costs the user a
gentle resources screen; a false negative costs silence.** Sensitivity is
preferred over precision throughout.

## Fixed in the July 2026 engineering pass

- **Curly-apostrophe bug (real miss, now fixed).** iOS and Android keyboards
  insert typographic apostrophes (`can’t`, not `can't`). Every apostrophe
  pattern in the list silently failed on phone-typed text — the app's primary
  input source. Text is now normalized (curly → straight quotes, whitespace
  collapsed) before matching. *Any future pattern must be written against
  normalized text.*
- **Coverage gaps closed** (category level): "end my life", "wish I was/were
  dead", "killing myself" (inflection), "harm myself" (previously only the
  compound "self-harm"), passive-ideation phrasings around not waking up,
  "sleep forever", burden statements ("I'm a burden"), "can't take it
  anymore", "won't be around much longer", "ready to die", overdose
  vocabulary, additional self-harm methods (burning, starving), and the
  internet euphemisms **"unalive"** and **"kms"** — important given younger
  users routinely use platform-safe euphemisms instead of the clinical words.

## Findings that need a product/clinical decision (NOT yet fixed)

### 1. Check-in notes are never scanned — highest-priority gap
The daily check-in has an optional free-text note ("Anything else?"). **No
crisis scan ever runs on it.** Only journal entries are scanned
(`checkin-archive-scan` does retention roll-ups only, no crisis check). A
user who writes crisis language in the nightly check-in note instead of the
journal is invisible to the safety net. For an app whose core loop *is* the
check-in, this is arguably a bigger hole than any missing word.
*Recommended fix:* add `flagged_crisis` to the `checkins` table, scan
`note` in the nightly job with the same shared wordlist, and extend
`useCrisisCheck` to look at both tables. Moderate effort (migration + one
query each side).

### 2. Up to ~24h detection latency by design
The scan is nightly, and the resources screen only appears on next app open.
Someone journaling crisis language at 9pm may see nothing until the following
evening. This is a deliberate, documented posture (not a crisis service, no
real-time monitoring promised — the consent screen says "nightly"), but the
reviewer should explicitly endorse or reject it. *Option if rejected:* run
the same `checkCrisisLanguage` at save time (client- or edge-side) to set the
flag immediately, keeping the nightly job as the backstop. Low effort.

### 3. Wordlist is single-copy but should be shared — DONE (July 2026)
~~The list lives only in `nightly-journal-scan`.~~ The wordlist + normalizer
now live in `supabase/functions/_shared/crisisWordlist.ts` and are imported
by `nightly-journal-scan` (both the journal and check-in-note scans use the
same `checkCrisisLanguage`). One list, reviewed once. Any future save-time
check should import the same module.

### 4. Regional coverage across the six shipping countries — ADDRESSED (July 2026)
~~The list is UK/US English.~~ Quiet Signal ships in six English-speaking
countries (US, GB, CA, AU, NZ, IE). This was never a translation gap but a
regional-idiom gap. The list now includes region-specific euphemisms that
were previously absent, folded into ONE union list applied to **every** user
regardless of detected country (locale detection can be wrong — default is
US — users travel, and phrasings mix; gating per country would create false
negatives, against our sensitivity bias). Country tags in the source are for
reviewer organisation only; they do not restrict where a pattern applies.

Added in this pass:
- **UK / Ireland / Australia / NZ dialect:** `top myself`, `do myself in`,
  `offing myself`, `had enough of it all`, `want this to end`. Plus a
  normalization fold `meself → myself` so every "…myself" pattern also
  catches the GB/IE/AU dialect form.
- **North American / online algospeak:** `self-delete`/`self-deletion`,
  `sewerslide` (homophone of "suicide"), `kys` (self-directed in a private
  journal). Complements the existing `kms`/`unalive`.
- **Self-harm inflection fixes (real misses):** `self[\s-]?harm` only matched
  the bare compound — now matches `self-harming`/`selfharmed`; added
  `self-injury`/`self-injuring` (common US/CA clinical phrasing); added an
  anchored `cutting my wrists/arms/thighs/legs/skin` alongside the existing
  `cutting myself` (bare "cutting" is too false-positive-heavy to include).
- **Casual-contraction normalization:** `gonna→going to`, `wanna→want to`,
  `gotta→got to`, so phone-typed casual entries still match the patterns.

Verified July 2026 with a true-positive / false-positive test harness: all
regional additions flag their intended phrases; no NEW false positives beyond
the ones already documented below. Still NOT a substitute for the
professional clinical review, which remains ship-blocking (Section 4.5).

## Known false-positive patterns (accepted for now, reviewer to confirm)

- `cut(ting)? myself` matches "cutting myself off from social media".
- `want it to (be over|stop)` matches ordinary pain talk ("this flare — I
  just want it to stop"). For this app's audience that fires often — but a
  chronic-pain user in that state seeing a support screen may be the right
  outcome anyway. Reviewer call.
- "could have killed myself laughing" (UK idiom) matches.
- `kms` could rarely match initials/typos; judged worth it.
- `suicid(e|al)` matches discussion *about* suicide (news, a friend), not
  just first-person ideation.

The cost of each: the user sees the Crisis Resources screen once and that
entry is excluded from weekly insights. Tolerable individually; if flag rates
run high in practice (the job returns `flagged` counts — watch them), trust
erosion ("the app is watching me") becomes the risk. The consent screen
already discloses the nightly check, which is the right mitigation.

## Known residual gaps (for the professional reviewer)

- **Method-specific vocabulary.** Deliberately not enumerated by the
  engineering pass; a clinical reviewer working from crisis-line training
  materials (e.g. Samaritans, Zero Suicide Alliance, PAPYRUS resources)
  should decide what belongs here.
- **Obfuscated spellings** (deliberate misspellings, spaced-out letters,
  emoji substitutions) are not caught by regex and realistically never will
  be — a wordlist has a ceiling, and the product should not claim otherwise.
- **Context and negation.** "I would never hurt myself" flags. Regex cannot
  fix this; accepted as sensitivity bias.
- **Third-person risk** ("my friend says she wants to die") flags as if
  first-person. Arguably correct behavior (resources still useful).

## Questions for the professional reviewer

1. Is nightly + next-open latency an acceptable posture for this product's
   non-crisis-service positioning? (Finding 2)
2. Should check-in notes be scanned? (Engineering recommendation: yes —
   Finding 1)
3. Review the pattern list line by line: additions, removals, and whether
   the sensitivity bias is correctly tuned for this audience.
4. Is the auto-shown Crisis Resources screen the right response, shown the
   right way (once per flag, dismissible, gentle)?
5. Does the consent-screen disclosure wording match what the mechanism
   actually does? (It says "nightly, on-device-style check" — it is nightly
   but server-side; wording should be corrected to avoid overclaiming.)

## Alignment with Samaritans' industry guidelines (July 2026)

Mapped against [Samaritans' "Managing self-harm and suicide content online"
guidelines](https://www.samaritans.org/about-samaritans/research-policy/internet-suicide/guidelines-tech-industry/)
(2020, developed with DHSC, Meta, Google, academics). Most principles target
platforms with *public* user-generated content; Quiet Signal hosts private
journals, so several apply lightly. Honest mapping:

| # | Principle | Quiet Signal status |
|---|-----------|--------------------|
| 1 | Understand impact of SH/S content | ✅ This document; risks/benefits understood |
| 2 | Clear accountability | ✅ Founder (Richard) is the named accountable person — record this in internal docs |
| 3 | Robust content policy | 🟡 Mechanism exists (scan → exclude → signpost); ToS/consent describe it; no formal written policy doc yet |
| 4 | User-friendly reporting | 🟡 Mostly N/A (no public content). Edge case: a recipient who receives a worrying shared message has no in-product guidance — consider one line on the share page pointing to support resources |
| 5 | Moderation (human + AI) | ✅ Automated wordlist scan; NO human review of private journals — deliberate, privacy-first, and defensible for a private diary (document as a decision, not an omission) |
| 6 | Reduce access to harmful content | ✅ N/A by design — no feeds, no search, no discovery of others' content |
| 7 | Support user wellbeing / signposting | ✅ Strong — 24/7 services, country-specific resources, "speak to someone you trust" is the app's entire premise |
| 8 | Communicate sensitively with users in distress | ✅ Auto-shown resources screen is gentle, non-judgemental, plain-language; matches their tone guidance |
| 9 | Collaboration + transparency | 🟡 In progress — contacting Samaritans' Online Harms Advisory Service (below); mechanism disclosed in privacy policy |
| 10 | Staff wellbeing around SH/S content | ✅ No one reads flagged entries. Note for the founder: working on this wordlist is itself exposure — take the same care you'd give a user |

**The zero-cost route to sign-off:** Samaritans operate a free **Online Harms
Advisory Service** for sites and platforms of any size —
`onlineharms@samaritans.org` / samaritans.org/industryguidelines. Sending them
this document and the wordlist for advice, then implementing what they say,
constitutes review by a qualified safety organisation. Also relevant and free:
[#chatsafe guidelines](https://www.orygen.org.au/chatsafe) (Orygen) and Zero
Suicide Alliance training.

## One wording correction found during this review

The consent screen (`ConsentScreen.tsx`) describes "a nightly,
on-device-style check for crisis language". The check is server-side, not
on-device. Minor, but for THIS feature the disclosure should be exactly
true. Recommend rewording to "an automated nightly check".
