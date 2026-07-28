# Quiet Signal — Handover (Jul 28, session 6)

Continues from the Jul 27 session-5 handover. This session: established what Google actually requires before public launch (and found the previous plan was aimed at the wrong track), confirmed Sentry reports on current builds, diagnosed and fixed a real sign-out bug Richard hit live, shipped v43 to internal testing, and replaced the reviewer demo account so Google is no longer being handed Richard's personal health data.

## What the app is

**Quiet Signal** is a daily pain / anxiety / energy check-in app for people living with chronic pain, PTSD or anxiety. A person logs a quick check-in plus an optional note, can share an honest status with someone they trust (recipient needs no login), gets weekly reflection insights from their own journal entries, and can export their history as a PDF. Free and Pro tiers.

It is explicitly **not** a crisis service or a medical device. There's a mandatory lexicon-based crisis-language safety net that excludes flagged entries from insights and surfaces a Crisis Resources screen, but it never tries to assess or respond to a crisis itself.

**Wording constraint:** never describe this as "clinical" anything in external copy or summaries — *even negated*, e.g. "non-clinical mental health app". The word is legally sensitive for this product. Internal code comments saying "not clinical" are fine and intentional.

Stack: Expo / React Native 0.81.5 (Hermes, Fabric) with a web export; Supabase for backend (Postgres + RLS, Edge Functions, pg_cron); RevenueCat for subscriptions; Sentry for errors. No AI vendor anywhere in the product — sentiment and theme detection is lexicon/regex-based, deliberately.

**Design decision worth not re-litigating:** the History screen deliberately has **no trend chart and no up/down trend language**. People with PTSD or anxiety shouldn't be confronted with a "not getting better" line on a hard day. The chart and the trend sentence live exclusively in the PDF report, viewed by explicit choice.

## Key identifiers

* Repo `C:\dev\quiet-signal` / GitHub `Valentigo-Ai/quiet-signal`, branch `main`
* Supabase project `quiet-signal`, id `bzczbsrtbnqiydscvnak` (eu-west-2 London, free tier)
* Package `com.quietsignal.app`; Play app id `4973719539259427979`; internal testing track id `4700064166027906652`
* Play developer account "Cloud Seaker", id `7440677865943147994`, **personal account**, signed in as `zargona2z@gmail.com`, Chrome profile `u/2`
* RevenueCat project id `4d31fc1f`
* Sentry org `valentigo`, project `react-native`, region `https://de.sentry.io`
* Website `https://quietsignal.co.uk`, privacy policy `https://quietsignal.co.uk/privacy-policy/` (live, thorough, UK GDPR-aware)

## Standing facts (carry forward, don't re-ask)

Everything from session 5 still holds, plus:

* **Commit and push from PowerShell** (GCM has creds); build in WSL. `npm run typecheck` is fast in either shell.
* **Installing a new build wipes AsyncStorage.** Test persistence bugs with a force-close, never a reinstall. Also means the first launch after an install has *no persisted session*, so any bug gated on one can't reproduce on that launch.
* Play Console lands on `u/0` and bounces to a scary-looking signup page. Use `u/2`.
* Claude Code commits to `main` in parallel — assume the tree can move.
* Avoid running git from the Cowork side; it leaves `.git/index.lock`.

## Corrections to earlier handovers

* **"Nothing from build 37 onward" in Sentry is no longer true.** Events are landing from build 42 and 43. Sentry demonstrably reports on current builds — see below. The old to-do item "prove Sentry is actually reporting" is **closed**, and no throwaway build is needed.
* **Store listing screenshots are done**, contrary to the Jul 21 handover's "what's left" list. All three sets are full: phone 8/8, 7-inch tablet 8/8, 10-inch tablet 8/8. The only empty slot is Android XR, which isn't required. Richard had completed these between sessions. (I repeated the stale item in the first draft of this handover without checking the console — verify against live state, not against the previous handover.)
* **The 11 pending Play Console changes were not the blocker they looked like.** App content shows "You're all caught up" — all 10 declarations are complete and "Ready to send for review", including Sign in details, Target audience and Data safety. The session-5 handover's blocker chain had already been cleared by the Jul 21 session.
* **`user_entitlements` in Supabase is not what gates Pro in the app.** `src/lib/proEntitlement.ts` is explicit: RevenueCat is the source of truth, the app reads `info.entitlements.active["pro"]` from the SDK. The Supabase table is a server-side record populated by the RevenueCat webhook and is currently enforcement-only-on-paper. Writing to it changes nothing the user sees. (I got this wrong mid-session and had to correct it.)

## Google Play: what's actually required

Richard's account is **personal**, created after 13 Nov 2023, so the testing requirement applies. Production is locked — the console says so directly: "You don't have access to production yet."

The requirement is **12 testers opted in for 14 continuous days**, not 14 testers. Critically, **internal testing contributes nothing** toward it — only a *closed* test counts, no matter how many internal testers or how long. All 40+ builds and the internal track to date count for zero.

Dashboard state:

* Closed testing: **2 of 5 complete** — countries/regions selected ✓, a release has been created ✓; still to do: select testers, preview and confirm the release, send for review
* **0 testers currently opted in**
* Open testing is unavailable until production access is granted

Realistic sequence: finish setup → create closed release and pass Google review (a few days) → get 12 people opted in and *installed* (invited-but-not-installed doesn't count) → 14 continuous days → production access questionnaire (≤7 days review). Three to four weeks of elapsed time minimum.

**On paid tester services:** Richard asked about a £9.99 "15 testers" service. Google doesn't ban paid testers, but the production application asks what engagement you got, what feedback you received, and *what you changed as a result* — and lists "testers not being engaged" as an explicit rejection reason. A service selling you the answers is selling a description of a test that didn't happen. Recommended real recruitment instead; the decision is still open.

## Sentry: the sign-out bug

Richard reported live that tapping Log out did nothing. Three issues fired within the same minute, all from `src/context/AuthContext.tsx`, all on `release: com.quietsignal.app@0.1.0+42`:

* `getSession still running after 6000ms` (soft telemetry timer)
* `signOut timed out after 6000ms` (×2 — his two taps)
* `getSession never settled after 45000ms` (hard telemetry timer)

App start 09:48:35, hard timer at 09:49:21 — `getSession` hung the full 45s on wifi, device online, not low memory.

**Root cause, two defects:**

1. **The fallback couldn't fall back.** `signOut()`'s 6s timeout fired correctly and dropped into the catch, but the local-only fallback was then `await`ed with no timeout. auth-js serialises every auth call behind one lock, so it queued behind the stuck `getSession` and hung too — meaning `setSession(null)` on the next line never ran. The safety net failed in exactly the situation it existed for.
2. **The bootstrap could undo a sign-out.** On the persisted path `await bootstrap` is unbounded by design. If it resolved *after* the user signed out, it called `setSession(data.session)` with the pre-sign-out session and signed them back in. `resolved` guarded the timers but nothing guarded this direction.

**Fix (`73c41855`):**

* `signOut()` now sets `signedOutRef`, clears session state and calls `clearPersistedSession()` **before** any network call. The server call still runs (it's what revokes the refresh token) but is purely best-effort, and the local fallback is fire-and-forget rather than awaited.
* New `clearPersistedSession()` in `src/lib/supabase.ts` deletes the AsyncStorage key directly, bypassing auth-js. AsyncStorage has no lock to queue behind, so it's the one clear that can't be blocked. Without it, a sign-out during a hang could leave the session on disk for the next cold start to restore.
* `signedOutRef` is checked before the bootstrap's `setSession` and in `onAuthStateChange` (a null session always applies; only a non-null one is suppressed). **Reset on every sign-in path** — `signUp`, `signIn`, `signInWithGoogle`, `confirmPasswordReset`. Missing one would make signing back in silently do nothing, which is worse than the original bug.
* Auth requests now time out at **8s**; everything else stays at 20s. `timeoutFetch` picks by matching `/auth/v1/` in the URL. Justification: the Sentry data is bimodal, not a slow tail — 4 events at the 6s marker vs 6 at the 45s marker, i.e. past ~6s `getSession` essentially never completes. There is no population of slow-but-successful auth requests to protect. The 20s default was itself a guess from an earlier session, chosen when the alternative was no timeout at all; it's kept for non-auth requests because `generate-message` can legitimately take double figures.

**Verified on device:** cold start, sign out, sign back in without restarting, force-close and reopen — all clean, no new Sentry events. **Not verified:** that the fix works *during* a hang, because the hang didn't recur. It's intermittent and can't be summoned. What's confirmed is no regression on the risky path.

**For next time it happens:** on v43, `signOut timed out after 6000ms` appearing in Sentry while the app signs you out normally is the fix *working* — the event is now diagnostic only. Under v42 the same event meant you were stuck.

**The hang itself is not fixed.** We've made the app degrade gracefully and give up sooner. Why a request stalls between the device and Supabase is a separate, still-open investigation.

## Release: v43

Version code 43, released 28 Jul 11:43 to **internal testing** (deliberately not closed — internal is instant, closed goes through review, and there was no point starting that clock with an unverified build). Commit `c84ed3db`. Artifact `build-1785235115402.aab`.

Release notes were added successfully via **Manage release → Edit release details** after publishing — the first build since v38 to have them. The Prepare-release notes field still doesn't survive the upload re-render; don't type them there.

### Bundle hashes

```
v35  982ee4618915d770b369f7c0d32f48f8
v37  b7deadaa4399c7d95bc671041754344b
v38  8da047f445451aaecced98454f33ce81
v39  d81d92df20682cd4a26d292fc09bae97
v40  112a42be8ab315093e13aba6fdb7d99c
v41  b6cfd73c5082856ac3788ec388bb905c
v42  e2d32fd97d2cc1c2a1d7f409599439ef
v43  ae8d0bec9c7094fe6f68bd8945fbd365
```

**The v43 string check was inconclusive, and the reason generalises.** Hermes stores the string table as one contiguous blob, so `strings | grep -c` returns 1 for anything present regardless of occurrence count — the counts are meaningless. Worse, this change added no new string literals at all (`clearPersistedSession`, `signedOutRef`, `AUTH_FETCH_TIMEOUT_MS` are identifiers and are minified away), so no literal could distinguish v43 from v42 even in principle. Same trap as v40. The hash is the only evidence.

## The reviewer demo account

**The problem found:** Sign in details was handing Google reviewers `cunninghamr76@gmail.com` — Richard's own account, containing his real check-ins and journal entries. Allowed, but not intended.

**Why `testuser*` accounts couldn't be used:** all 14 had zero check-ins (signup-flow throwaways), and the Supabase dashboard can only *send a recovery email* for an existing user, never set a password — and `@example.com` is a reserved domain that can't receive mail. Dead end.

**What was done:**

* Created `reviewer@quietsignal.co.uk` via Add user → Create new user (which *does* set a password at creation), auto-confirmed. UID `b3ded684-f48b-4c0e-b183-8d58c8c10777`.
* Seeded via `scripts/seed-demo-account.sql`: 18 check-ins across 7–27 July, 3 journal entries, 1 share recipient, plus a profile row with consent and age confirmed so a reviewer lands in the app rather than onboarding. Nothing crisis-flagged; days deliberately skipped so it doesn't read as generated; scores mostly 1–3 with a gentle improving trend.
* Granted the **Pro** entitlement in RevenueCat, lifetime/unlimited. This matters: Play's own wording is "we need to be able to access **all parts** of it... If we can't gain full access to your app, it may be rejected in review", and without Pro the PDF export and 60/90-day history are padlocked.
* Also inserted a `user_entitlements` row tagged `review_comp` / `manual` / `review`. This does *not* affect the app (see corrections above) but keeps the server side consistent if the currently record-only `is_pro` enforcement is ever switched on.
* Play Console Sign in details updated to `reviewer@quietsignal.co.uk` and verified saved.

Confirmed working on device: logs in, three weeks of history visible, Pro features unlocked.

## What's left to do

1. **Health apps declaration** — listed as pending in session 5, not covered by the Jul 21 session, and App content now reports nothing outstanding. Needs confirming whether it exists for this app at all. Matters more than usual given the crisis surface.
3. **Start the closed testing track** — select testers, confirm the release, send for review. Then 12 testers opted in for 14 continuous days.
4. **Recruit 12 testers.** Friends, family, colleagues all count. Do this *after* the track is live so the clock starts when they join rather than leaving them waiting.
5. **Resolve Sentry issues REACT-NATIVE-1/-2/-3** so anything appearing under them from now on is known to be v43 behaviour rather than old noise.
6. **Commit `scripts/seed-demo-account.sql`** — has uncommitted edits repointing it at the reviewer account.
7. **Before public launch:** revisit leaked password protection (deliberately off, Pro-plan gated), and replace the temporary app name — testers currently see `com.quietsignal.app (unreviewed)`.
8. **Still open from earlier sessions:** the £3.99 real-purchase test on RevenueCat, and turning on server-side `is_pro` enforcement in `generate-message` (currently record-only).
9. **Why `getSession` hangs at all.** v43 handles it gracefully; nothing explains the stall itself.

## Gotchas (new this session)

* **App content is buried.** It's under **Monitor and improve → Policy and programs → App content**, not anywhere obvious. The direct `/app-content` URL redirects to the app list. "Sign in details" was previously called "App access" — the console says so on the page, and old notes use the old name.
* **Supabase dashboard cannot set a password on an existing user.** Only "send password recovery". To get a known password, create the user via Add user → Create new user.
* **`.gitignore` is UTF-16 encoded** (a PowerShell redirect artefact), so grep reports it as a binary file. Harmless. It does cover `*.aab`, so build artifacts in the repo root are invisible to git.
* **RevenueCat's duration dropdown shifts under the cursor** — a click landed on "Until date" instead of "Lifetime". Screenshot and verify the selection before granting.
* **Data safety says health data is "not shared"** while the Share feature puts a check-in behind a public link. There's a legitimate carve-out for user-initiated sharing so it's probably fine, but it's worth a deliberate second look rather than an assumption — accuracy here is high-stakes for a health app.

## Test data note

The `testuser*` accounts and `testuser123@example.com` remain empty and unused; the seed was moved to `reviewer@quietsignal.co.uk` before anything was written to them. `cunninghamr76@gmail.com` holds Richard's own real data (13 check-ins) and should not be used for demos. The only genuinely crisis-flagged rows remain the 25 July pair, both long outside the 24h window and inert.
