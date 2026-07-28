# Quiet Signal — Handover (Jul 27, session 5)

Continues from the Jul 27 session-4 handover. This session shipped **v39 through v42**: gave the crisis support screen a real expiry after working out why it resurfaced days later, fixed four PDF report bugs, settled the check-in scale labels after three failed attempts, fixed a navigation bug that stuck the Settings tab on the recipient screen, ran a full security/data audit, and cleared the push backlog — `main` and `origin/main` have been level since the first push and every commit is up.

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

Version code 39, versionName 0.1.0. Released to internal testing 27 Jul 13:08. Release notes were added *after* publishing — which turned out to be the only order that works; see checklist step 8.

Contains `dadc6de0` on top of session 4's `df5fab73` and `6de919aa`.

### Fixes shipped in v39

* **`dadc6de0` — crisis surface expiry + explicit owner scoping.** As above.
* **PDF: PTSD legend without a line.** `pdfReport.ts` gated both the `<polyline>` and the legend entry on `rows.some(r => r.ptsd_score !== null)`. A one-coordinate polyline draws nothing, so with a single PTSD score the key advertised "PTSD (dash-dot)" next to an empty chart — reads as a rendering failure rather than "not enough data yet". Line and legend entry now both require `>= 2` points; the table column still appears at `>= 1`, since one score is worth showing. Verified in a 30-day export with exactly one PTSD score: column present with `–` elsewhere, no PTSD line, no PTSD legend entry.
* **PDF: content running off the page.** The chart SVG was emitted at its natural 640px and the table used auto layout, so a long note widened the table past the printable area and got clipped mid-sentence ("...how much more I can" just stopped), and the right-hand date label was cut to `2026-07-`. Now: `@page { size: A4; margin: 14mm }`, `box-sizing: border-box`, body padding down from 32px to 8px (Android's WebView print adapter applies its own margin and may ignore `@page`, so this degrades safely), `.chart svg { width: 100% }`, and `table-layout: fixed` with an explicit `<colgroup>`. Notes now wrap across lines instead of being lost.
* **PDF: scores breaking across lines.** Pain rendered as `4 /` / `4` on two lines while Anxiety fitted on one. `.score { white-space: nowrap }`.

## Release: v40

Version code 40, versionName 0.1.0. Released to internal testing 27 Jul 14:06. Contains `57ea75bb` (below) on top of v39. Release notes again added *after* publishing — see checklist step 8.

The only change in it is the scale-label measurement fix. **Confirmed on device: it worked** — "Overwhelmed" sat on one line for the first time. It was then superseded by v41, which kept the measurement mechanism but moved the size from per-pill to per-row and shortened the labels; see below for why.

A "1 Warning" appeared on the review step before publishing and was not read. It does not surface on the published release page. Most likely the routine missing-deobfuscation-file notice, but that is an assumption; expand it on the next release's review step to confirm.

## The change in v40

* **`57ea75bb` — scale labels measure themselves instead of guessing a font size.** "Overwhelmed" *still* broke mid-word in v39, after v38 and v39 each shipped a threshold estimated from a screenshot. Character count is a poor proxy for rendered width — "Overwhelmed" carries both a `w` and an `m` and is far wider than "Overloaded" despite being one character longer. New `PillLabel` component renders single-word labels with `numberOfLines={1}`, reads the laid-out line back via `onTextLayout`, and steps the font down 0.5pt at a time until the word is no longer truncated, floor 7px. `pillFontSize` survives as the *starting* estimate so the first paint is close and nothing visibly settles. Multi-word labels ("A little on alert") are untouched — they wrap at spaces, which reads fine. This also adapts to a large system font scale, which no fixed size could.

  As of v39 on device, `Grounded`, `Triggered` and `Overloaded` all fit on one line; only `Overwhelmed` did not. v40 fixed that. The measurement approach is still in the code today — v41 only changed *who owns the size* (the row rather than each pill) and shortened the labels so the rows could stay at full size.

  Richard also suggested hardcoding `Over\nwhelmed` as a fallback. Not needed in the end, but worth recording that it's what the code did until v38 — the same map produced `Ground\ned` and `Trigger\ned` with the orphaned "ed" that prompted the original complaint, though for "Overwhelmed" alone it did look acceptable.

  **The wider lesson, which cost three builds:** v38, v39 and v40's first attempt each picked a font size by estimating from a screenshot, and each was wrong. It only worked once the code asked the device what it had actually laid out. Same shape as several other bugs this session — the answer was in the logs, the deployed policy or the bundle, not in reasoning about what should be happening.

## Releases: v41 and v42

**v41** — check-in scales. Confirmed good on device: every option in a row now renders at the same size.

* `ScaleInput` owns **one font size per row** rather than one per pill. Independent sizing kept every word on its own line but left three different text sizes side by side ("Calm" at full size next to a visibly smaller "Overwhelmed"), which read as uneven and pulled the eye to the smallest option instead of presenting five equal choices. Pills report "too wide" along with the size they were measured at, and the row only steps down if that still matches — otherwise three pills reporting off one layout pass would drop the row 1.5pt at once and overshoot.
* **Labels shortened** so the rows can stay at full size. `Overwhelmed` → `At my limit`, `Grounded` → `Steady`, `Overloaded` → `Too much`. Only *unbroken words* are constrained; multi-word labels wrap at their spaces, so "A little on edge" at 16 characters costs nothing while "Overwhelmed" at 11 forced the whole row down. Roughly 7 characters is the ceiling for a single word at full size. **`Triggered` (9) was kept deliberately** — it's the term people with PTSD use, and the alternatives that fit ("Set off") lose that recognition, so the PTSD row sits slightly below full size but uniformly. The constraint is now documented at the top of `scaleLabels.ts`, since it isn't visible from reading the strings and is what tripped up v38, v39 and v40.
* Renaming is **retroactive in display only** — labels are looked up by score, so past check-ins now read with the new wording in History and in new PDF exports. No stored data changed.

**v42** — PDF summary and a navigation fix.

* **PDF summary was rendering as one run-on paragraph.** `summaryText` is built as lines joined with `\n` (title, body, blank, footer), which is right for the share sheet, but the PDF dropped it into a div with no `white-space` rule and HTML collapsed the newlines. `white-space: pre-line` restores it — `<br>` wouldn't work because `escapeHtml` strips tags.
* **The summary appeared to contradict itself.** "Pain's stayed steady" immediately followed by "pain Severe" reads as a contradiction. It isn't one — the first describes *change across the period*, the second the *level on the final day*, and pain that's severe every day is genuinely both. But a reader can't tell that from the wording, and this is a document someone hands to their GP, so it can't depend on the distinction being inferred. Now: trend sentence prefixed "Over that time", "steady" → "stayed about the same" (which also drops the faint suggestion of *fine* that "steady" carried), and the last sentence reads "On 27 July itself, pain was Severe". Range no longer repeated three times; "ptsd" capitalised.
* **Settings tab got stuck on "Shared with".** `goAddRecipient` navigated `Main > Settings > Recipients` with nested params. Those params live on the Settings **tab route** and persist after you leave the screen — and the tab carries `unmountOnBlur` (added earlier to stop it reopening on its last-visited screen), so every remount re-applied them and jumped straight back to Recipients. The two fixes were fighting and the params won. `RecipientsScreen` is now **also registered on the root stack as `ShareAddRecipient`**, which the share flow opens, so nothing is written to the Settings tab and there's nothing to replay. Back returns to the share screen rather than the settings menu — the second half of the same bug. The `initial: false` workaround is gone. Safe outside the tab navigator because `RecipientsScreen` doesn't call `useBottomTabBarHeight()`. `unmountOnBlur` stays for the Settings-internal case.

## Final audit (end of session 5)

Run as a last pass before the final build. Everything below was checked against live state, not against the migration files.

* **All 26 RLS policies in `public` are owner-scoped.** `checkins_select_own` verified correctly parenthesised — the precedence bug is genuinely gone from the deployed policy.
* **The 16-auth-users vs 15-profiles item is resolved and is not a bug.** The profile-less account is `zargona2z@gmail.com`, created 1 July, email never confirmed, never signed in. Profiles are created on first sign-in, which never happened. 14 of the 16 accounts are `testuser*@example.com` fixtures.
* **Cron healthy** — `nightly-journal-scan` (03:00) and `checkin-archive-scan` (03:15) have both succeeded every night through 27 July.
* **Migrations clean** — 17 applied, 17 in repo, all matching by name.
* **Free/Pro history ranges align with RLS.** Free is 7/30 days, Pro adds 60/90, and the RLS policy grants unrestricted history only to pro. So a free user can't select a range RLS would silently truncate. Went looking for a bug here; there isn't one.
* **Two security advisors, both reviewed and deliberately left:** `under_free_recipient_limit()` is `SECURITY DEFINER` and callable via RPC, but it filters on `auth.uid()` internally, returns only a boolean about the caller's own count, and *must* be DEFINER — making it INVOKER is what caused the recursion bug fixed in `fix_recipients_insert_recursion`. Leaked password protection is **off deliberately**: it's Pro-plan gated and Richard is on the free plan. Not an oversight — don't re-raise it as a to-do. Worth revisiting before any public launch, since it protects against credential reuse (a forgot-password link addresses recovery, which is a different problem). Minimum password length and character requirements *are* available on the free plan if a partial measure is wanted.
* **Two performance advisors**, both trivial at this data size (`user_entitlements` initplan, an unused index).

## Sentry: what the errors actually are

Worth reading before treating `REACT-NATIVE-1/2/3` as outstanding bugs.

* They are **handled diagnostics, not failures**. `signOut timed out after 6000ms` carries `handled: yes` and `outcome: local-fallback` — the network sign-out was slow, the 6s guard fired, and it fell back to a local sign-out. The person still got signed out. `getSession still running after 6000ms` is a soft warning (`outcome: slow`) that forces nothing.
* **They're one bad minute on one phone.** `REACT-NATIVE-1` and `-3` share a trace ID, device and app session: a single cold start at 08:58:34 on 27 July on a Samsung SM-A055F (`device.class: low`, 3.8 GB RAM, Mediatek, wifi). That device is **Richard's own test phone**. The "5 users impacted" is an artefact — install IDs regenerate on reinstall, and the app was reinstalled repeatedly that day.
* **Every error event in the last 30 days is from builds 25, 28, 29, 33 and 35. Nothing from 37 onward.** That's consistent with the `timeoutFetch` wrapper (added 26 July, so v37+) having fixed them.
* **But that can't be distinguished from Sentry not reporting on ≥37 at all.** The last event from any build is 35, and `reportDataError` has never produced an event on any build. Absence of errors and absence of reporting look identical from the outside. Treat "Sentry is healthy on current builds" as an assumption, not a fact, until something positively proves it.

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
v40  112a42be8ab315093e13aba6fdb7d99c
v41  b6cfd73c5082856ac3788ec388bb905c
v42  e2d32fd97d2cc1c2a1d7f409599439ef
```

v39 additionally verified by string: `table-layout` appears twice (new PDF CSS), and `note_scanned_at` / `processed_at` appear in the app bundle for the first time — they only entered client code with the crisis-window change. `Ground\ned` remains absent.

v41 and v42 both got proper two-way string checks (new literals present, removed ones absent), which is the standard to aim for: `At my limit` / `Steady` / `Too much` / `needs 2+ entries` present and `Overwhelmed` / `Grounded` / `Overloaded` absent in v41; `Over that time` / `stayed about the same` / `pre-line` / `ShareAddRecipient` present and `stayed steady` / `That day: pain` absent in v42.

**The string check was inconclusive for v40, and this is a trap worth remembering.** `onTextLayout` and `ellipsizeMode` look like they'd prove `PillLabel` shipped, but both are already present in v39's bundle — they come from React Native's own `Text` internals, not our code. Our own identifiers (`PillLabel`, `MIN_PILL_FONT_SIZE`) are minified away and aren't greppable either. So for a change that adds no new *string literal*, the hash comparison is the only evidence available; don't mistake a matching framework symbol for confirmation.

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
7. Upload to **internal testing** — an `.aab` can't be sideloaded, so this is the only route onto the device. Don't navigate away or reload the tab while the upload is in flight; the page warns that leaving cancels it.
8. **Add release notes after publishing, not before.** Typing them into the Prepare release page does not survive the page re-render that happens when the bundle upload finishes — it was lost that way on v39, v40, v41 and v42, so this is reliable behaviour rather than bad luck. The route that works: publish, then Internal testing → the release → **Manage release** → **Edit release details**, paste inside the `<en-GB>` tags, Save. Limit is 500 characters per language.

## What's left to do

Everything Richard reported this session is fixed and confirmed on device. v42 is the last build of session 5 and he's signed it off. What remains:

1. **Prove Sentry is actually reporting on current builds.** The single most valuable open item, and it now subsumes the old "confirm `reportDataError` reaches Sentry". No event has arrived from any build ≥37, and `reportDataError` has never produced one on any build. That's consistent with the timeouts being fixed, and equally consistent with the SDK being silent — the two are indistinguishable from outside. Cheapest resolution: ship one build that deliberately fires a `reportDataError` on startup, confirm it lands in Sentry, remove it. Until then, treat the clean error feed as unproven rather than as good news.
2. **`getSession` / `signOut` slow path.** See the Sentry section above before spending time here — these are handled diagnostics with working fallbacks, all from builds ≤35, all from one low-end test device in a single bad minute. Possibly already fixed by `timeoutFetch` (v37+). Blocked behind item 1: you can't tell whether it's fixed until you can tell whether Sentry is reporting. If it does turn out to need work, the suggested step is unchanged: a duration-only breadcrumb around the AsyncStorage persisted-session read.
3. **Decide whether to submit the 11 pending Play Console changes.** Not blocking internal testing. Remember managed publishing is **off**, so approval publishes automatically.
4. **Before any public launch:** revisit leaked password protection (Pro-plan gated, deliberately off on the free plan — see the audit section), and note the app is still in **Draft / Not yet sent for review** with a temporary app name.
5. Session-3's "check-in produced no POST at all" has not recurred across the whole of session 5. Leave open but downgraded further.

Closed this session and **not** to be re-raised: the 16-vs-15 profiles mismatch (benign, see audit), the lowercase "ptsd" in the PDF (fixed in v42), the scale-label sizing (settled in v41), and leaked password protection (a deliberate plan decision, not an oversight).

## Test data note

A crisis flag was seeded on the 27 July check-in during this session to QA the support screen, then **cleared** — `flagged_crisis` back to `false` and `note_scanned_at` back to `null`, so the nightly scan will process that note normally. The only flagged rows in the database are the genuine 25 July check-in and journal entry, both now outside the 24h window and therefore inert.
