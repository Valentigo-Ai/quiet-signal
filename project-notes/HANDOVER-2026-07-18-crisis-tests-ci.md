# Quiet Signal — Handover (2026-07-18, session 2: crisis wordlist, UX, tests, CI)

Continuation of the same day's earlier handover (`HANDOVER-2026-07-18.md`, which
covered the RevenueCat/pricing work). This session was a **safety + quality
pass**: regional crisis wordlist, the crisis-surface UX, a completeness audit,
the first automated tests, and CI. Everything below is committed and pushed to
`origin/main`; the app-side changes ship with the next build, the edge-function
changes are deployed live.

## Key identifiers (unchanged)
- Repo: `C:\dev\quiet-signal` / GitHub `Valentigo-Ai/quiet-signal` (branch `main`)
- Supabase project: `quiet-signal`, id `bzczbsrtbnqiydscvnak` (eu-west-2)
- App package `com.quietsignal.app`; Play Console app id `4973719539259427979` (dev account "Cloud Seaker", login index **u/2**)
- Live: app `quietsignal.co.uk/app/`, site `quietsignal.co.uk/`, share page `/share/`

## What was done this session (in order)

1. **Regional crisis wordlist.** The crisis-language detection was a single
   English list applied to all six shipping countries (US/GB/CA/AU/NZ/IE — all
   English-speaking, so this was regional idiom, not translation). Consolidated
   the wordlist + normalizer into one shared module
   `supabase/functions/_shared/crisisWordlist.ts` (imported by
   `nightly-journal-scan`), and expanded it as a **union list applied to
   everyone** (deliberately NOT gated per country — locale can be wrong, default
   is US, people mix phrasings; gating would add false negatives). Added: UK/IE/
   AU/NZ dialect ("top myself", "do myself in", "offing myself", "meself"→
   "myself" fold), online algospeak ("self-delete", "sewerslide", "kys"),
   self-harm inflection fixes (`self-harm` didn't match "self-harming"; added
   self-injury and anchored "cutting my wrists/arms/…"), and casual-contraction
   folds (gonna/wanna/gotta).

2. **"okay day" copy fix.** `generate-message` moderate-day fallback changed
   from "A middling day…" to "An okay day — nothing severe, just getting through
   it." (Richard found "middling" odd.)

3. **Both edge functions deployed** to `quiet-signal`: `nightly-journal-scan`
   → **v8**, `generate-message` → **v6**. Triggered the nightly scan once
   manually (via the cron's own `net.http_post` + vault secret) to confirm v8
   runs clean: returned HTTP 200, `{processed:0, checkin_notes_processed:1,
   flagged:0}`. **Note:** comment-only edits were made to those two files
   *after* deploy (the Samaritans record in step 7), so the repo is ~a few
   comment lines ahead of what's deployed — behaviour is identical, **no
   redeploy needed**.

4. **Crisis-surface UX fix (app-side).** Previously, when the safety net found
   a flag it *silently switched the tab* to Support and advanced the
   "acknowledged" timestamp at show-time — so anyone who didn't notice could
   never be re-shown it. Now: the auto-shown Support screen shows a warm,
   dismissible acknowledgement card (uses the `autoShown` param that was passed
   but ignored), and the timestamp only advances on an explicit "OK, I
   understand" tap (`acknowledgeCrisisSurface`). Until acknowledged it re-appears
   on each app open. Files: `useCrisisCheck.ts`, `CrisisResourcesScreen.tsx`,
   `CrisisBanner.tsx`. Timing kept nightly (see Samaritans note). Consent copy
   needed no change — `legalCopy.ts` already says "an automated nightly check".

5. **Journal layout bug fix.** On the Journal tab, tapping "Show saved entries"
   made the write-box (a centered `flex:1`) shrink and its Save button overflow
   onto the toggle row. Fixed with a `writeSectionCompact` style (`flex:0`) when
   entries are expanded. File: `JournalScreen.tsx`.

6. **Completeness audit** (read-only). Verdict: the *app itself* is functionally
   complete — all screens real (no stubs), 6 tables with RLS + 22 policies,
   typecheck clean, RevenueCat payments fully wired (the old `PROJECT-STATUS.md`
   is STALE on this — it still says payments are a stub; the 07-18 handover is
   correct). What's outstanding is launch/ops, not features (see below).

7. **First automated tests + CI.** There were zero tests. Added, using Node's
   built-in runner (Node 22+, `--experimental-strip-types`) with **no new
   dependencies**:
   - `tests/crisisWordlist.test.ts` — regional true-positives, normalization,
     false-positive controls, documented sensitivity trade-offs.
   - `tests/proEntitlement.test.ts` — the Pro money-gate. To make it testable
     without loading native billing, the pure decision logic was extracted to
     `src/lib/proEntitlement.ts` (`hasProEntitlement`, `deriveIsPro`) and
     `ProContext.tsx` now imports them (behaviour-identical, typecheck confirms).
   - `package.json` → `"test": "node --experimental-strip-types --test
     \"tests/**/*.test.ts\""`; `tsconfig.json` excludes `tests/**`.
   - **18/18 tests pass, `tsc --noEmit` clean.**
   - `.github/workflows/ci.yml` runs `npm run typecheck` + `npm test` on every
     push/PR. First run is **green** (confirmed in the Actions tab).

8. **Recorded the Samaritans review outcome.** Richard held the Samaritans
   review meeting (Online Safety team, Online Harms Advisory Service). Their
   steer: for a private, non-crisis-service journal there's **no single right
   answer on scan timing** — nightly-plus-signpost is defensible — and they
   raised getting the **per-country wordlist** right (now addressed by the union
   list). Updated the "SHIP-BLOCKING" markers in `crisisWordlist.ts`, the
   nightly scan, and `docs/crisis-wordlist-review.md` to record the review as
   **held**, so it stops reading as an open blocker.

## Commits pushed this session (all on `origin/main`)
- `f03fe83f` — regional wordlist + shared `_shared/crisisWordlist.ts` + "okay day" copy
- `f554c2a3` — crisis-surface acknowledgement card + explicit-ack timestamp
- `e2b2f3d9` — Journal saved-entries overlap fix
- `ab0a59a4` — crisis + Pro-entitlement unit tests; Samaritans review record
- `4aef5773` — CI workflow (HEAD)

## What's left to do (nothing blocking from the code side)
- **Purchase test still pending Google's price-cache propagation** (the #1
  active blocker from the earlier 07-18 handover) — checkout sheet was showing
  the old £4.79 price hours after the Play Console fix. DO NOT tap Subscribe
  until it shows £3.99/£29.99. Not a code issue. Then confirm Pro unlocks +
  `restorePurchases`.
- **Play store listing** still Draft (description/screenshots); **closed testing
  track** required before production.
- Deferred/minor: RevenueCat→Supabase webhook (only for server-side Pro
  enforcement); `npm audit` 13 moderate; `pg_net` in `public` schema.
- **Intentional, do NOT "fix":** leaked-password protection is off on purpose
  (it's a paid Supabase feature Richard isn't paying for).

## Gotchas (carried forward + new)
- Windows `.git/index.lock` can wedge; delete from PowerShell (`Remove-Item
  .git\index.lock -Force`). Line-ending LF→CRLF warnings on `git add` are
  harmless.
- Keep `project-notes/powershell..txt` OUT of every commit (line-ending noise).
- No EAS cloud builds (out of credits); local builds in WSL2 only.
- Tests/CI need **Node 22+** (they use the built-in test runner + type
  stripping). Fine locally and on the CI runner.
- Edge-function deploys via the Supabase MCP must include all relative deps
  (`nightly-journal-scan` needs `_shared/crisisWordlist.ts` +
  `_shared/themeDictionary.ts`); `verify_jwt:false` for the cron functions.

## Health check for a new chat
`npm run typecheck` → clean; `npm test` → 18/18; GitHub Actions "CI" → green.
