# Quiet Signal — Handover (Jul 27, session 5)

Continues from the Jul 27 session-4 handover. This session: shipped v39, worked out why the crisis support screen kept resurfacing days after the entry that caused it and gave it a real expiry, fixed three PDF report bugs, corrected two standing facts session 4 got wrong, and got the four outstanding commits pushed — `main` and `origin/main` are level for the first time since session 3.

## What the app is (unchanged)

See the Jul 25–27 handovers. Non-negotiables unchanged.

## Standing facts / preferences (carry forward, don't re-ask)

Everything from session 4 still holds **except two corrections**, plus new items:

* **CORRECTION — pushes work fine, from PowerShell.** Session 4 recorded that `origin` is HTTPS with no credential helper and that a PAT / `gh auth login` / SSH remote was needed. That is only true in WSL. Git for Windows bundles Git Credential Manager and already has credentials stored, so `git push` from PowerShell succeeded with no prompt at all. Commit and push from PowerShell; build in WSL.
* **CORRECTION — `npm run typecheck` is fast in PowerShell too.** Session 4 said it takes 5+ minutes over the Cowork mount and should be run in WSL. It returns in seconds from PowerShell as well. Either shell is fine; only the *build* actually requires WSL (that's where the Android SDK/NDK live).
* **Installing a new build wipes app storage.** This is why every new build asks you to log in again — the Supabase session lives in AsyncStorage. Anything else in AsyncStorage goes with it, including `quiet-signal:last-crisis-ack`. This was the root of the "support screen keeps coming back" report and is worth remembering whenever a bug looks like "local state isn't persisting": test it with a force-close, not a reinstall.
* **Play Console lives under a third Google account.** Not `cunninghamr76@` or `cunninghamr34@` — it's **`zargona2z@gmail.com`**, which is Chrome profile index **`u/2`**. Developer account **"Cloud Seaker"**, account ID `7440677865943147994`. App `com.quietsignal.app`, app ID `4973719539259427979`, internal testing track ID `4700064166027906652`. Going to `play.google.com/console` lands on `u/0` and bounces to the *create a developer account* signup page, which looks alarming and isn't.
* Cowork-side git still can't delete inside the mounted folder — running even `git status` from the Cowork side leaves a `.git/index.lock`. Clear with `rm -f .git/index.lock` (WSL) or `Remove-Item -Force .git\index.lock` (PowerShell). Best to avoid running git from the Cowork side at all.
* Claude Code commits to `main` in parallel during a session. Assume the tree can move under you.

## The crisis surface: what was actually wrong

Richard's question was "will the support screen disappear after a day, and only fire again if they say a flagged word — we don't want to keep showing it days later when they're feeling a bit better." It was showing on 27 July off the back of a 25 July entry.

Three layers, found in this order:

1. **The screen had no time expiry at all.** `useCrisisCheck` queried flagged rows with `created_at > lastAck`, where `lastAck` is an AsyncStorage timestamp advanced *only* when the person taps "OK, I understand". Nothing else retired a flag. So a flag stayed live indefinitely on any device that had never acknowledged it.
2. **A fresh install is exactly such a device.** Installing a build wipes AsyncStorage, so `LAST_ACK_KEY` reset to its `1970-01-01` default while the flagged rows sat untouched in the database. Confirmed in the Supabase API log: every crisis check in the retained 24h window — four separate logins — sent `created_at=gt.1970-01-01T00:00:00.000Z`, never anything else. A reinstalling user or someone on a new device would have hit the same thing.
3. The in-memory `acknowledged` state in `CrisisResourcesScreen` hides the card for as long as the component stays mounted, which made the acknowledgement *look* like it was working within a session while nothing was persisting across one.

**Fix (`dadc6de0`):** a 24-hour window, measured from `note_scanned_at` / `processed_at` — the scan timestamps — **not** `created_at`. This distinction matters: the nightly scan runs at 03:00, so an entry written at 14:00 isn't flagged for another 13 hours. A 24h window on `created_at` would leave only ~11 hours of real visibility, and an entry written just after 03:00 would be flagged ~27 hours after `created_at` and could expire before it was ever shown. Both scan columns are written in the same update as `flagged_crisis` (see `nightly-journal-scan`), so every flagged row has one.

Also in that commit: both crisis queries and the History load now filter `user_id` explicitly rather than relying on RLS alone (closes session 4's item 4, after the `checkins_select_own` precedence bug), and `useCrisisCheck` bails out when there's no session instead of falling through to its show-on-uncertainty branch.

QA'd on device and confirmed: card auto-shows, "OK" dismisses it, and it stays gone across a force-close and reopen.

## Release: v39

Version code 39, versionName 0.1.0. Released to internal testing 27 Jul 13:08. Release notes were added *after* publishing (the release-notes field is on the Prepare release page, easy to skip past — fill it in before hitting rollout next time).

Contains `dadc6de0` on top of session 4's `df5fab73` and `6de919aa`.

### Fixes shipped in v39

* **`dadc6de0` — crisis surface expiry + explicit owner scoping.** As above.
* **PDF: PTSD legend without a line.** `pdfReport.ts` gated both the `<polyline>` and the legend entry on `rows.some(r => r.ptsd_score !== null)`. A one-coordinate polyline draws nothing, so with a single PTSD score the key advertised "PTSD (dash-dot)" next to an empty chart — reads as a rendering failure rather than "not enough data yet". Line and legend entry now both require `>= 2` points; the table column still appears at `>= 1`, since one score is worth showing. Verified in a 30-day export with exactly one PTSD score: column present with `–` elsewhere, no PTSD line, no PTSD legend entry.
* **PDF: content running off the page.** The chart SVG was emitted at its natural 640px and the table used auto layout, so a long note widened the table past the printable area and got clipped mid-sentence ("...how much more I can" just stopped), and the right-hand date label was cut to `2026-07-`. Now: `@page { size: A4; margin: 14mm }`, `box-sizing: border-box`, body padding down from 32px to 8px (Android's WebView print adapter applies its own margin and may ignore `@page`, so this degrades safely), `.chart svg { width: 100% }`, and `table-layout: fixed` with an explicit `<colgroup>`. Notes now wrap across lines instead of being lost.
* **PDF: scores breaking across lines.** Pain rendered as `4 /` / `4` on two lines while Anxiety fitted on one. `.score { white-space: nowrap }`.

## Committed but NOT yet built

* **`57ea75bb` — scale labels measure themselves instead of guessing a font size.** "Overwhelmed" *still* broke mid-word in v39, after v38 and v39 each shipped a threshold estimated from a screenshot. Character count is a poor proxy for rendered width — "Overwhelmed" carries both a `w` and an `m` and is far wider than "Overloaded" despite being one character longer. New `PillLabel` component renders single-word labels with `numberOfLines={1}`, reads the laid-out line back via `onTextLayout`, and steps the font down 0.5pt at a time until the word is no longer truncated, floor 7px. `pillFontSize` survives as the *starting* estimate so the first paint is close and nothing visibly settles. Multi-word labels ("A little on alert") are untouched — they wrap at spaces, which reads fine. This also adapts to a large system font scale, which no fixed size could.

  As of v39 on device, `Grounded`, `Triggered` and `Overloaded` all fit on one line; only `Overwhelmed` did not. **Needs a v40 build to verify.** Richard's alternative suggestion, if the auto-shrink doesn't satisfy: hardcode `Over\nwhelmed`. Note that's what the code did until v38 — the same map also produced `Ground\ned` and `Trigger\ned` with the orphaned "ed" that prompted the original complaint, but for "Overwhelmed" alone it did look acceptable.

## Play Console state

* App status is **Draft / Internal testing**, "Not yet sent for review". Temporary app name `com.quietsignal.app (unreviewed)` shows to testers until review.
* **Managed publishing is OFF.** Once changes are submitted and approved they go live automatically — there's no hold-and-release step.
* **11 changes are pending and not yet submitted for review:**
  * Closed testing – Alpha: add 176 countries/regions; add rest of world; unsync from production
  * Store listings: en-GB default store listing (app name and required info)
  * App content: content rating questionnaire; target audience and content (18+); privacy policy URL (`https://quietsignal.co.uk/privacy-policy/`); ads declaration; data safety questionnaire; health apps declaration
  * Store settings: app category (Health & Fitness)
* **Internal testing releases do not require submitting any of these.** Internal testing doesn't go through review, so builds can ship to testers with the 11 still pending. Do not hit "Submit 11 changes for review" on the Publishing overview unless that's deliberately the intent.

## Bundle hashes

```
v35  982ee4618915d770b369f7c0d32f48f8
v37  b7deadaa4399c7d95bc671041754344b
v38  8da047f445451aaecced98454f33ce81
v39  d81d92df20682cd4a26d292fc09bae97
```

v39 additionally verified by string: `table-layout` appears twice (new PDF CSS), and `note_scanned_at` / `processed_at` appear in the app bundle for the first time — they only entered client code with the crisis-window change. `Ground\ned` remains absent.

## Pre-build checklist (revised again)

1. `list_migrations` on Supabase vs `supabase/migrations/`. Compare **by migration name, not filename timestamp** — migrations applied via MCP get a different version number than the repo filename, so a timestamp diff shows false positives. (17 vs 17 and clean as of this session.)
2. `npm run typecheck`. Either shell; seconds in both.
3. Commit and **push from PowerShell** — Git Credential Manager handles auth there with no prompt. WSL has no credential helper and will prompt for a password GitHub no longer accepts.
4. `rm -f build-*.aab` — a stale artifact in the repo root will otherwise be the one you upload.
5. Build **in WSL** with the working dir override:
   ```bash
   EAS_LOCAL_BUILD_WORKINGDIR=/home/zargon/eas-build eas build --platform android --profile production --local
   ```
   `/tmp` is a RAM-backed tmpfs capped at ~4.9G and EAS wants 10G+; without this the build dies with `No space left on device` after ~18 minutes despite hundreds of gigs free. Record the commit hash EAS prints at the start — `git log -1` afterwards isn't reliable, since Claude Code may commit mid-build. A failed build still consumes a version code.
6. **Verify the bundle by hash, not by grep.** `index.android.bundle` is Hermes bytecode (magic `c61fbc03`), so grepping for code always fails whether or not the change is present; only the string table is greppable. Extract from the `.aab` (`base/assets/index.android.bundle`), `md5sum` it, compare against the previous build's hash above. Where a change adds or removes a string literal, grep is a useful extra check.
7. Upload to **internal testing** — an `.aab` can't be sideloaded, so this is the only route onto the device. **Fill in the release notes on the Prepare release page before rolling out.** Don't navigate away or reload the tab while the upload is in flight; the page warns that leaving cancels it.

## What's left to do

1. **Build v40 and verify the label auto-shrink** (`57ea75bb`). "Overwhelmed" on one line in the Anxiety scale is the check.
2. **Confirm `reportDataError` actually reaches Sentry.** Still the one unverified link in the chain, carried from session 3. It has zero events, while `reportAuthHang` has three live issues through the identical `Sentry.captureException` path — so the wiring looks structurally sound but is still unproven.
3. **`getSession` / `signOut` slow path.** Sentry `REACT-NATIVE-1` (`signOut timed out after 6000ms`, 31 events / 5 users), `REACT-NATIVE-2` (`getSession never settled after 45000ms`), and a **new** `REACT-NATIVE-3` (`getSession still running after 6000ms`, first seen 26 Jul). Suggested next step unchanged: a duration-only breadcrumb around the AsyncStorage persisted-session read.
4. **Decide whether to submit the 11 pending Play Console changes.** Not blocking internal testing. Remember managed publishing is off.
5. **16 auth users but 15 profiles** — one account has no profile row. Still not investigated.
6. Cosmetic: the PDF summary sentence reads "ptsd Triggered" in lowercase. Consistent with "pain" and "anxiety" either side of it, but an acronym in lowercase reads oddly.
7. Session-3's "check-in produced no POST at all" has not recurred. Leave open but downgraded.

## Test data note

A crisis flag was seeded on the 27 July check-in during this session to QA the support screen, then **cleared** — `flagged_crisis` back to `false` and `note_scanned_at` back to `null`, so the nightly scan will process that note normally. The only flagged rows in the database are the genuine 25 July check-in and journal entry, both now outside the 24h window and therefore inert.
