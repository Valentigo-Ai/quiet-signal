# Quiet Signal — Handover (Jul 26, session 3)

Continues from the Jul 26 session-2 handover (v34 shipped). This session: shipped **v35**, found and
fixed a live production breakage nobody knew about, discovered that the July PTSD/Anxiety split had
silently stopped asking 11 of 14 users about anxiety, built the Settings editor for changing what
you track, and closed a structural observability gap that had been hiding all of it.

## What the app is (unchanged)

See the Jul 25–26 handovers. Non-negotiables unchanged: nightly crisis-wordlist scan, auto-surfaced
Crisis Resources screen, one-tap crisis tab, full data export/deletion, no AI-vendor references,
errors-only crash reporting with no PII, explicitly non-clinical.

## Stack / access (additions this session)

Unchanged from session 2, plus:

- **Sentry MCP is now connected** (`mcp.sentry.dev`, org `valentigo`, project `react-native`).
  Issue triage no longer needs the browser.
- Play Console internal-testing URL that works directly:
  `https://play.google.com/console/u/2/developers/7440677865943147994/app/4973719539259427979/tracks/4700064166027906652`

## Standing facts / preferences (carry forward, don't re-ask)

Everything from session 2 still holds — no Supabase leaked-password protection (paid tier, off the
table permanently), no formal clinical review ever, prepare releases and stop at the review step so
Richard clicks Save/Submit/Publish himself.

New this session:

- **Migration files in the repo are NOT applied to Supabase by anything.** No CI, no build step, no
  hook. Applying them is a separate manual act. This caused the incident below.
- **Never trust a `.aab` without checking it contains the code you think it does.** See the
  pre-build checklist below.

## The main incident: a shipped feature wrote to a column that didn't exist

`20260726140210_add_ptsd_score.sql` was committed and shipped inside v34, but never applied to the
database. `CheckInScreen` puts `ptsd_score` in its upsert payload unconditionally (null when PTSD
isn't selected, but the key is always present), and PostgREST rejects the whole write when a column
isn't in its schema cache. **Every check-in failed for every user on v34, not just PTSD users**, and
the History screen returned HTTP 400 on every load.

Blast radius was near-zero — 12 check-ins total, internal testing track — but it would have been the
first thing any tester hit.

Found by listing applied migrations and noticing the newest was five days old. Both pending
migrations were then applied via the Supabase MCP and verified against `information_schema`.

**The reason nobody noticed for hours** is the second finding, below.

## The structural problem: Supabase failures were invisible to Sentry

Every Supabase call in the app handled failure with `Alert.alert` or ignored the returned `error`
entirely. Nothing threw, so Sentry recorded **zero** events across a total outage of the core daily
loop. The History screen was the worst case: it rendered an empty list, indistinguishable from "you
have no entries", to users who had months of data.

Fixed (commit `7616e5ac`): a `reportDataError(error, area, context?)` helper next to `reportAuthHang`
in `sentry.ts`, capturing a PostgrestError's `code`/`message`/`details`/`hint` and never the row
payload. Wired into every `.from()` / `.functions.invoke()` error path in the app. Where errors were
previously discarded entirely, the underlying bug was fixed too — History and Journal now show a
distinct "couldn't load" state, Data Export blocks rather than handing over a silently incomplete
file, and the onboarding recipient insert and profile upsert no longer proceed as if they'd saved.

Deliberately not wired up: `signUp`/`signIn`/`signInWithGoogle`, which are expected user outcomes
(wrong password, email taken), not the schema/RLS/constraint class this is for.

**Caveat, stated plainly:** the end-to-end path was never confirmed live. The real `PGRST204` error
shape was reproduced against the live project and traced through the helper's exact logic, but
`@sentry/react-native` won't load outside the RN bundler and there was no device in the loop, so
`Sentry.captureException` was never actually observed firing for a data error. **First thing to
verify on v35.**

## The silent product regression: legacy `presenting_concerns` values

The July split (`0bc60196`) replaced the stored keys `chronic_pain` / `ptsd_anxiety` / `both` with
`chronic_pain` / `anxiety` / `ptsd`, but nothing rewrote the values already in the database. 11 of 14
profiles still held `["both"]`. `CheckInScreen` checks for `"anxiety"` and `"ptsd"` literally, so
those users matched neither and **were asked neither question** — the split quietly removed both
dimensions from every pre-split user, with no error and nothing on screen.

Fixed in two layers (commit `7a445489`):

- Migration `20260726155913_migrate_legacy_presenting_concerns` maps `both` → `chronic_pain` +
  `anxiety`, and `ptsd_anxiety` → `anxiety`. Verified after: only the three current keys exist.
- `normalisePresentingConcerns()` in `src/constants/presentingConcerns.ts` as a defensive second
  layer, wired into both read sites.

**Product decision, deliberate:** `ptsd` is never added on someone's behalf. It would start asking a
brand-new daily trauma-response question, in unfamiliar wording (Grounded → Flooded), that the person
never opted into. They can now add it themselves in Settings.

## New feature: Settings → What you're tracking

Chronic pain / anxiety / PTSD can now be changed after onboarding
(`src/screens/settings/WhatYoureTrackingScreen.tsx`, commit `1ed5565d`).

Design notes worth keeping:

- Gating keys off a new `profiles.presenting_concerns_set` boolean, **not** `concerns.length > 0`.
  Once the list is editable, an empty array means two different things (skipped onboarding vs.
  deliberately unticked everything) and only the flag distinguishes them. Without it, unticking
  everything would silently switch Anxiety back on — the app overriding a choice just made.
  Onboarding sets the flag only when the selection is non-empty (so skipping behaves as it always
  has); any save from Settings sets it true unconditionally.
- `CheckInScreen` re-reads on `useFocusEffect`, not mount, so edits apply without an app restart.
- Removing a concern never touches or hides already-logged scores, and the screen says so outright —
  otherwise people won't correct their choices for fear of losing history.
- Onboarding now says "You can change this any time in Settings", which lowers the stakes of the
  original question.

## Also done

- Crisis card copy fix (`d8c9f33e`): removed "you're not in any trouble" (negation priming) and
  "There's nothing you have to do" alongside it. Swept the repo — no other instances anywhere.
- `docs/store-listing.md` Data Safety line corrected: it described three health dimensions, there are
  now four.

## v35 shipped

Version code 35, released Jul 26 5:47 PM to Internal testing, release notes added after publishing.
Remote at `ebfbaa2b`.

## Pre-build checklist (adopt this — it caught a real problem this session)

A build made at 15:40 was nearly uploaded containing code from *before* a 16:02 fix. Caught by
grepping the bundle. Before every upload:

1. `list_migrations` on Supabase vs. the newest filename in `supabase/migrations/` — apply anything
   pending **before** building.
2. `npx tsc --noEmit` from WSL (much faster than over the mount).
3. `rm /mnt/c/dev/quiet-signal/build-*.aab` so there's no ambiguity about which file to upload.
4. Build, then verify the bundle actually contains the change:
   `unzip -p build-*.aab base/assets/index.android.bundle | grep -c "<a distinctive new string>"`
5. Only then upload. Once uploaded, **don't navigate away or reload that tab** until saved — that's
   what burned version code 32.

## What's left to do

1. **QA v35 on device** — not yet done at time of writing. In order: log a check-in (see the
   unexplained item below), then Settings → What you're tracking (tick/untick, save, confirm Home
   updates without restart), then History.
2. **Confirm `reportDataError` actually reaches Sentry.** The one unverified link in the chain.
3. **Unexplained:** a check-in logged manually at ~15:27 UTC produced *no* `POST /rest/v1/checkins`
   in the Supabase API log at all — no failed request, no request. Not diagnosed. The error
   reporting from this session is what should reveal it if it recurs.
4. **`getSession` slow path** — Sentry `REACT-NATIVE-1` / `REACT-NATIVE-2`. Telemetry only; the
   optimistic path means nobody is stuck on the splash, so this is not user-facing. 100% correlation
   with `device.class: low` across 4 users and 2 device models, all on wifi and reporting online.
   Two hypotheses (JS/main-thread contention on low-RAM devices vs. genuinely slow radios) can't be
   separated without span timing (`tracesSampleRate: 0` by design). Suggested cheap next step: a
   duration-only breadcrumb around the AsyncStorage persisted-session read.
5. **Decide whether to submit the pending Play Console changes.** All App content declarations are
   ready; no known blocker. Richard's call on timing.
6. Backlog: Sentry perf tracing, post-launch site tweaks.
