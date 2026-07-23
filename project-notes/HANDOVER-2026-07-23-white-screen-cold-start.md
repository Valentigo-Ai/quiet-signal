Quiet Signal — Handover (2026-07-23, white-screen-on-cold-start bug: FIX SHIPPED, awaiting overnight confirmation)

WHAT QUIET SIGNAL IS

A private, low-friction daily mental-health check-in app. Core loop: a daily check-in (pain/anxiety/energy scale + a short note), a private journal (scanned nightly for crisis language and for sentiment/theme insights, template/lexicon-based — no AI vendor anywhere in the product), and an always-one-tap-away crisis resources tab that auto-detects the user's region. The differentiating feature is the share-flow: a check-in can be shared with a trusted contact via a no-login web link (`quietsignal.co.uk/share/`), so the recipient doesn't need the app themselves. Free tier plus a paid Pro tier (more background photos, longer history ranges, more recipients) billed monthly/yearly through Google Play Billing via RevenueCat. Built as an Expo/React Native (managed workflow, no native folders — Continuous Native Generation) Android app (iOS not yet targeted for release), backed by a live Supabase project (Postgres + RLS, edge functions, `pg_cron`). Marketing/support/privacy-policy site is a WordPress build at `quietsignal.co.uk`. Non-negotiables carried through the build: crisis-language check always runs first on journal entries; crisis resources always one tap away; full data export and account deletion are implemented; no AI vendor used anywhere.

PLAY STORE LAUNCH READINESS — WHAT'S DONE, WHAT'S LEFT

This app is currently on Internal Testing only (v17, see below) — it is NOT yet on a closed/open testing track, and NOT yet submitted for production. This section consolidates the fuller picture from the dedicated launch-prep and RevenueCat handovers (`HANDOVER-2026-07-21-play-console-launch-prep.md`, `HANDOVER-2026-07-19-revenuecat-webhook.md`) — not independently re-verified in this session, so double-check current state before acting on it.

Done:
* Full MVP feature set against spec: onboarding (welcome, "what are you dealing with", consent/age-gate, email or Google sign-up/in, add first recipient), daily check-in with ambient video background, share-flow, history/trends, private journal with nightly crisis-language + sentiment scan, region-aware crisis resources (auto-detect + manual override in Settings), settings (recipients, privacy notice, data export, delete account, backgrounds picker), Pro paywall with regional pricing.
* Backend live on Supabase (`bzczbsrtbnqiydscvnak`, eu-west-2): full schema + RLS (owner-only policies, zero security-advisor findings besides an intentionally-off paid feature), edge functions (`generate-message`, `share-checkin`, `get-shared-message`, `nightly-journal-scan`, `delete-account`, `revenuecat-webhook`), nightly cron scan.
* Website live at `quietsignal.co.uk` (WordPress, branded, 4 pages), recipient share view live at `/share/`.
* RevenueCat wired for Pro subscriptions; client identity synced to the Supabase user id; server-side webhook plumbing built (`user_entitlements` table mirrors entitlement state) — but enforcement is NOT yet turned on anywhere (currently record-only; nothing rejects a non-Pro caller of the premium `generate-message` path).
* Play Console: Internal Testing track live and active. Content rating, Data safety (drafted, not fully submitted — blocked, see below), Government apps, Financial features, Advertising ID, and App category + contact details are all done and published. Store listing text + icon + feature graphic are uploaded (draft, not yet the final submission).
* This session: cold-start white-screen bug found, fixed, and shipped as v17 to Internal Testing (see below — not yet confirmed resolved on-device).
* Separate thread, fully resolved: the keyboard-covering-input bug (`HANDOVER-2026-07-21-keyboard-fix-v3-RESOLVED.md`), confirmed working on-device.

Left to do before production submission, in roughly the order the Play Console checklist forces:
1. Sign in details declaration — needs Richard directly: Google requires a demo/test account (email + password) for reviewers. Claude will not type a password into any field (standing rule) — Richard supplies or creates the account and types the password himself.
2. Target audience & content questionnaire — blocked until #1 is done.
3. Full Data safety form submission — content is already correct and saved as draft; just needs #2 cleared, then a final Save from the Preview step.
4. Store listing screenshots — 2-8 phone screenshots plus required 7" and 10" tablet screenshots, all need a real device. Richard needs to capture (check-in, history, crisis-resources, share-flow are good candidates) and hand over for upload.
5. Feature graphic background color — the uploaded draft has a terracotta-toned background that doesn't match the icon's actual navy background. Cosmetic only, Richard's call whether to fix.
6. Closed testing track — Play requires 12 testers opted in, running 14+ days, before "Apply for production" unlocks. Not started yet — Internal Testing doesn't count toward this.
7. £3.99 real purchase test on RevenueCat — confirm Pro actually unlocks in-app, a row lands in `public.user_entitlements` with `is_pro=true`, and `restorePurchases` works. Still the top functional blocker on the payments side.
8. Turn on server-side Pro enforcement — add an `is_pro` check (reading `user_entitlements`) to the `generate-message` edge function so it rejects non-Pro callers. Should happen after #7 confirms rows populate correctly; currently there is no server-side enforcement anywhere.
9. Confirm this session's cold-start white-screen fix (v17) actually holds — pending Richard's overnight test, see below.
10. A few manual Supabase/backend steps noted in the repo README that weren't re-verified this session: `CRON_SECRET` set on `nightly-journal-scan`, `RECIPIENT_WEB_URL` set on `share-checkin`, Google OAuth client configured in Supabase Auth settings (optional sign-in method) — worth a quick check they're actually set, not just documented as needed.
11. `npm run typecheck` / `npm test` / GitHub Actions CI — last confirmed clean as of commit `00deda22` (2026-07-19); not re-run since, worth a fresh check before production submission.

This thread (the white-screen bug below) is separate from the keyboard-covering-input bug (see `HANDOVER-2026-07-21-keyboard-fix-v3-RESOLVED.md` — that one is fully resolved and confirmed, not related to this). This is a different, older failure mode: a white screen that shows up specifically on a cold start (app opened after Android has killed the process in the background — e.g. left untouched overnight), not on backgrounding/resuming a live process.

BOTTOM LINE

Richard reported a white screen this morning (2026-07-23) on opening the app after not having used it since the previous night. Reproducible pattern: force-quitting (swipe away in recent apps) and reopening recovers it — but that's a workaround, not a fix, and it can't be asked of testers. A concrete, verifiable code defect matching this exact symptom was found and fixed (commit `0aa9c16c`), built as version 17, and published to Internal Testing this session. **Not yet confirmed fixed on-device** — Richard is waiting until tomorrow (a real overnight cold start) to see if it recurs. That's the critical open item for the next session.

KEY IDENTIFIERS (carry forward, unchanged from prior handovers)

* Repo: `C:\dev\quiet-signal` / GitHub `Valentigo-Ai/quiet-signal` (branch `main`), HEAD is `0aa9c16c`, pushed to `origin/main`.
* Package `com.quietsignal.app`; Play Console app id `4973719539259427979`; developer numeric id `7440677865943147994`; developer account "Cloud Seaker", signed in as `zargona2z@gmail.com`, Play Console login index `u/2`.
* Internal Testing opt-in/download link (persistent, always serves the latest release on that track): `https://play.google.com/apps/internaltest/4700064166027906652`
* Play Console dashboard for this app: `https://play.google.com/console/u/2/developers/7440677865943147994/app/4973719539259427979`
* Current Internal Testing "Latest release": **17 (0.1.0)**, published today (2026-07-23) ~10:14 AM, "Available to internal testers." This is the build with the fix — Richard has not yet done an overnight cold-start test on it.
* This Cowork session needs `C:\dev\quiet-signal` connected via `request_cowork_directory` before Read/Edit/Grep/Bash can touch the repo — do this again first thing in a new chat, it doesn't persist across sessions.
* No crash reporting (Sentry/Bugsnag/Crashlytics) is wired into this app. Confirmed via grep — nothing found. This matters: there is no way to capture a real stack trace or breadcrumb trail from an actual failure. All diagnosis this session was static code review plus Play Console's crash/ANR dashboard, not a captured log of the real event.

WHAT HAPPENED THIS SESSION

1. Richard reported: opened the app on his phone (same v16 build confirmed working the night before) and got a white screen. Force-close + reopen recovered it. No phone restart happened in between. This is a genuine cold-start-only bug (works fine warm, fails on a fresh process spawn).
2. Investigated via static code review (folder connected via `request_cowork_directory`):
   * Checked `App.tsx`: render is gated by `if (!fontsLoaded) return null` (line ~67), which happens *before* `ErrorBoundary` is even reached in the JSX tree. Anything that leaves `fontsLoaded` false forever is an unrecoverable, uncatchable blank screen.
   * Checked `src/lib/useAppFonts.ts`: `const [loaded] = useFonts({...})` — **discarding the second element of the tuple**, which is `error`. If font loading ever fails (more likely under memory/IO pressure right after a true cold start — the exact condition when Android has freshly relaunched a killed process) or simply hangs, `loaded` never becomes true, there's no fallback, and the app is stuck on `return null` forever. This is a real, root-cause-plausible defect, not a guess dressed up as one.
   * Ruled out other candidates by inspection: `AuthContext.tsx`'s session-restore bootstrap already has try/catch/finally from the earlier "white-screen-after-idle" fix (commit `32cf923f`) and is not the gap. `ProContext.tsx` and `BackgroundPrefsContext.tsx` both have proper try/catch/finally around their async bootstrap effects. `CrisisCountryContext.tsx` has an *unguarded* `AsyncStorage.getItem` in its bootstrap effect (no try/catch) but its `ready` flag doesn't gate any render path, so a failure there wouldn't blank the screen — flagged as a minor hygiene gap, not fixed (see Not Done below). `ScreenVideoBackground.tsx`'s `AppState`-driven video-playback watchdog is also unguarded but only affects the check-in screen's background video, not overall render.
   * Also considered whether `KeyboardProvider` (which wraps `ErrorBoundary` from the outside per `App.tsx`'s provider order — see prior handover) could throw and escape the boundary. No evidence found implicating it specifically (no Expo config plugin requirement for `react-native-keyboard-controller`, nothing else suspicious), but it remains a structural gap: **anything that throws above `ErrorBoundary` in the tree (KeyboardProvider, or the font-loading gate itself) cannot be caught by it.** Not restructured this session — flagged as a defense-in-depth item for later, see Not Done.
3. Checked Play Console → Android vitals → Crashes and ANRs (all types, 28-day window, including archived issues): **zero results**, including the day of the incident. This is real evidence, not just static analysis — it rules out a native crash or a frozen main thread (ANR). It's consistent with the `useAppFonts` theory: a stuck `return null` render never actually crashes or hangs the app from Android's perspective, so it wouldn't show up here regardless of exact trigger.
4. No `adb`/USB access from this Cowork session's sandbox — it's an isolated Linux environment, not Richard's real machine, so live logcat capture wasn't possible. This is the one gap in confidence: the diagnosis is well-founded but not confirmed by a captured log of the actual failure moment.
5. Fixed `src/lib/useAppFonts.ts`: now destructures `[loaded, error]`, logs a `console.warn` if `error` is set, and adds a 4-second timeout via `useEffect`/`setTimeout` so that if neither `loaded` nor `error` ever fires, the app proceeds anyway (system-font fallback) rather than hanging indefinitely. Returns `loaded || !!error || timedOut`. Full reasoning is commented in the file.
6. Committed as `0aa9c16c` ("Fix cold-start white screen: don't let font loading hang forever"), scoped to just this one file — the pre-existing unrelated modified/untracked files in the repo were left untouched, per Richard's standing instruction.
7. **Recurring gotcha hit again**: committing via this Cowork session's mounted-folder bash tool left stray `.git/HEAD.lock` and `.git/index.lock` files that the sandbox couldn't delete (`Operation not permitted`). Richard had to manually run, from PowerShell:
   `Remove-Item C:\dev\quiet-signal\.git\HEAD.lock, C:\dev\quiet-signal\.git\index.lock`
   before `git push` would work. **This has now happened at least twice across sessions — expect it every time a commit is made through this Cowork bash tool, not just as an occasional fluke.** Consider it a standing pre-push step.
8. Richard ran `git push` from PowerShell (as established — GitHub creds live in Windows Credential Manager, not WSL). Pushed clean: `64ef0a58..0aa9c16c main -> main`.
9. Richard built locally from WSL2 with the now-standard `TMPDIR` fix:
   `cd /mnt/c/dev/quiet-signal && TMPDIR=~/eas-tmp eas build --platform android --profile production --local`
   Succeeded, produced `/mnt/c/dev/quiet-signal/build-1784797816922.aab` (86.1 MB) → `C:\dev\quiet-signal\build-1784797816922.aab`.
10. This session navigated Play Console (via Claude-in-Chrome) to Internal Testing → "Create new release" and prepped the draft page. The `.aab` is too large for Claude's browser-upload tooling (~10MB cap), so Richard dragged the file in, saved, and published it himself. Confirmed afterward via Play Console: Internal Testing "Latest release" now shows **17 (0.1.0)**, "Available to internal testers," released today.

NOT DONE / OPEN FOR NEXT SESSION

1. **Critical**: confirm on-device whether the white screen actually recurs on a genuine overnight cold start with version 17 installed. Richard is waiting until tomorrow to check. Ask him first thing.
2. If it recurs on v17: the `useAppFonts` fix didn't fully address it, and the investigation needs to go further — likely candidates not yet ruled out: (a) something throwing above `ErrorBoundary` in the provider tree (`KeyboardProvider` sits outside it — see `App.tsx`), (b) a genuine native-module init race specific to a fresh process spawn that this session couldn't reproduce or log without device access.
3. Optional/hygiene: `CrisisCountryContext.tsx`'s bootstrap effect has an unguarded `AsyncStorage.getItem` call (no try/catch) — doesn't currently gate any render path so it's not urgent, but worth wrapping for consistency with the rest of the codebase's defensive patterns.
4. Optional but recommended given this is the second time a "silent, no-crash-report" white screen has hit this app: **wire up Sentry (or similar)** so any future recurrence comes with a real stack trace / breadcrumb trail instead of requiring static-analysis guesswork and a Play Console crash-dashboard check (which, as this session demonstrated, shows nothing for this class of bug since nothing actually crashes). Richard was offered this and hasn't decided yet — worth raising again if the bug resurfaces.
5. Still untouched: the separate Play Console launch-prep checklist (`HANDOVER-2026-07-21-play-console-launch-prep.md`) — carried forward from the prior handover, not part of this thread, still needs its own review.
6. Still optional from the keyboard-fix thread: grep the codebase for other `KeyboardAwareScrollView` usages sitting next to flex siblings that might have the same `minHeight: 0` class of bug (see `HANDOVER-2026-07-21-keyboard-fix-v3-RESOLVED.md`).

GIT / REPO STATE

* HEAD: `0aa9c16c` ("Fix cold-start white screen: don't let font loading hang forever"), pushed to `origin/main`.
* `git log --oneline -4`:

```
0aa9c16c Fix cold-start white screen: don't let font loading hang forever
64ef0a58 Fix Save entry/Show saved entries overlap on Journal screen
4466e353 Fix keyboard covering inputs: switch to react-native-keyboard-controller
3191790a Rework keyboard-covering fix using explicit keyboard height tracking
```

* Remaining `git status --short` — all pre-existing, unrelated, explicitly scoped out per Richard's repeated instruction across sessions. Don't bundle these into future commits without being asked:

```
 M README.md
 M docs/crisis-wordlist-review.md
 M project-notes/powershell..txt
 M web/index.html
?? project-notes/HANDOVER-2026-07-19-revenuecat-webhook.md
?? project-notes/HANDOVER-2026-07-21-keyboard-fix-v2.md
?? project-notes/HANDOVER-2026-07-21-keyboard-fix-v3-RESOLVED.md
?? project-notes/HANDOVER-2026-07-21-play-console-launch-prep.md
?? project-notes/HANDOVER-2026-07-23-white-screen-cold-start.md   (this file)
```

GOTCHAS — CARRIED FORWARD (still true, unchanged)

* `TMPDIR=~/eas-tmp` on every local build (WSL2 only): `cd /mnt/c/dev/quiet-signal && TMPDIR=~/eas-tmp eas build --platform android --profile production --local`. Without it, `--local` builds eventually hit WSL2's 4.9GB tmpfs `/tmp` wall again.
* `git push` from PowerShell, not WSL (GitHub creds live in Windows Credential Manager).
* Stray `.git/HEAD.lock` / `.git/index.lock` files after Cowork-session git commits — now confirmed a recurring pattern, not a one-off. Delete manually from PowerShell before the next git command:
  `Remove-Item C:\dev\quiet-signal\.git\HEAD.lock, C:\dev\quiet-signal\.git\index.lock`
* `.aab` upload to Play Console is manual (file size exceeds Claude's browser-upload tooling's ~10MB cap; this build was 86.1MB) — Richard drags/selects the file himself from `C:\dev\quiet-signal\build-<timestamp>.aab`.
* No native `android`/`ios` folders in the repo — fully managed Expo workflow (Continuous Native Generation). `eas build --local` regenerates the native project from `app.json`/`package.json` every build.
* Provider order in `App.tsx`: `KeyboardProvider` wraps everything; inside that, `ErrorBoundary` wraps `ThemeProvider` wraps `ProProvider` wraps `BackgroundPrefsProvider` wraps `CrisisCountryProvider` wraps `AuthProvider`. Anything that throws inside `KeyboardProvider` itself, or in the font-loading gate before the JSX tree is even returned, bypasses `ErrorBoundary` entirely. Keep this in mind if another "no error card, just blank" bug shows up.
* No crash reporting is configured (no Sentry/Bugsnag/Crashlytics) — Play Console's Android vitals crash/ANR dashboard only catches native crashes and ANRs, not silent JS render stalls. Confirmed empty (zero results, 28 days, all types) even during this exact bug's occurrence.

VERIFY IN A NEW CHAT

* Ask Richard first: did the white screen recur overnight on version 17?
* `git log --oneline -3` should show `0aa9c16c` at the top.
* Play Console → Internal testing → Releases → "Latest release" should show 17 (0.1.0), "Available to internal testers."
* If the white screen recurs on v17, don't re-reach for the same font-loading fix — that's now shipped and evidently insufficient. Go straight to the residual risks flagged above (item 2 in Not Done): something throwing above `ErrorBoundary`, or push harder on getting real device logs (e.g. ask Richard to connect the phone via USB to his own machine and run `adb logcat` himself during a reproduction, since this Cowork session has no path to his hardware).
