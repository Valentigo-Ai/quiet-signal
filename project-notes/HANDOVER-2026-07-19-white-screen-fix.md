# Quiet Signal — Handover (2026-07-19, white-screen-after-idle fix + device verification)

Continuation of the 2026-07-18 handovers (RevenueCat/pricing, then crisis-wordlist/tests/CI). This session was a live device-testing pass: verified Play price propagation, got the journal-layout fix onto a real device via internal testing, then found and fixed a **critical white-screen-after-idle auth bug**, rebuilt, republished, pushed, CI green. Everything below is committed and pushed to `origin/main`; the app-side change ships in internal-testing **version code 5**. No Supabase/backend changes this session.

## Key identifiers (carry forward)

* Repo: `C:\dev\quiet-signal` / GitHub `Valentigo-Ai/quiet-signal` (branch `main`)
* Supabase project: `quiet-signal`, id `bzczbsrtbnqiydscvnak` (eu-west-2) — **unchanged this session**
* App package `com.quietsignal.app`; Play Console app id `4973719539259427979`; developer account "Cloud Seaker" (id `7440677865943147994`, signed in as `zargona2z@gmail.com`), Play Console login index **u/2**
* Internal testing track id: `4700064166027906652`
* Internal testing opt-in link (share with testers): `https://play.google.com/apps/internaltest/4700064166027906652`
* Live: app `quietsignal.co.uk/app/`, site `quietsignal.co.uk/`, share page `/share/`

## What was done this session (in order)

1. **Verified Google Play price propagation.** Play Console → Subscriptions shows the correct GBP prices, both base plans **Active** (updated Jul 18): `quiet_signal_pro_monthly` = **GBP 3.99** (20% VAT), `quiet_signal_pro_yearly` = **GBP 29.99**. So the console-side price fix has fully taken; the old £4.79 is gone from Google's records. NOTE: console-correct is the prerequisite for propagation, not proof of it — Google Play Billing caches prices on-device separately and can lag the console by up to ~an hour. The only reliable confirmation is the on-device paywall.

2. **Shipped the journal-layout fix (`e2b2f3d9`, from the prior session) to a real device.** The overlap Richard kept seeing was because the phone was running an **older build (version code 3)** that predated the fix — app-side fixes need a rebuild + Play update, not just a code commit. Built version code 4, published to internal testing, and after Play propagation (~15–60 min) the device updated and the overlap was gone. Confirmed the fix is correct by re-reading `JournalScreen.tsx` (the `writeSectionCompact` `flex:0` change).

3. **Found & fixed a critical "white screen after a few hours" bug.** Testers reported the app showing a blank white screen a few hours after install, only fixable by delete + reinstall.
   * **Root cause (two compounding issues):**
     (a) Supabase's React-Native token auto-refresh was **never wired to `AppState`** — `autoRefreshToken: true` alone doesn't run a reliable timer on mobile, so the ~1-hour access token silently expired while the app was backgrounded.
     (b) The auth bootstrap in `AuthContext.tsx` had **no error handling**: if `getSession()` or `refreshConsentStatus()` threw (e.g. an expired token whose refresh call fails), `setLoading(false)` never ran. `RootNavigator` renders `null` while `loading` is true (`if (loading) return null`), so a stuck load = blank white screen. Reinstalling cleared AsyncStorage → no stored expired session → clean start, which is why it "worked" temporarily and then recurred.
   * **Fix (commit `32cf923f`):**
     - `src/lib/supabase.ts` — added an `AppState` listener that calls `supabase.auth.startAutoRefresh()` when active / `stopAutoRefresh()` when backgrounded (and starts it once at launch). Native-only (skipped on web).
     - `src/context/AuthContext.tsx` — wrapped the session-restore effect in `try/catch/finally` so `setLoading(false)` **always** runs, and a failed restore falls back to signed-out (login screen) instead of a blank screen. Guarded `refreshConsentStatus` in its own `try/catch` so it can never throw during startup.
   * `npm run typecheck` clean; `npm test` 18/18 pass.

4. **Built version code 5, published, pushed.** Local WSL2 build → `build-1784445223280.aab` (79 MB, version code 5). Published to internal testing (Jul 19, 8:20 AM), release notes describe the blank-screen fix. Pushed `32cf923f` to `origin/main`; **GitHub Actions CI green** (run #2).

## Build + release procedure (reference — this is the established flow)

* **Local build (WSL2 only, NOT PowerShell):** `cd /mnt/c/dev/quiet-signal && eas build --platform android --profile production --local`. Produces `build-<timestamp>.aab` (~79 MB) in the repo root; version code auto-increments (`appVersionSource: remote`, `autoIncrement: true` in `eas.json` production profile). ~10 min build. PowerShell fails with "Unsupported platform, macOS or Linux is required".
* **Publish to internal testing:** Play Console → Test and release → Testing → Internal testing → **Create new release** → **Upload** the `.aab` (must drag or select manually via the file picker — the browser file-upload tooling caps at 10 MB, and the `.aab` is ~79 MB, so it can't be automated) → paste release notes inside the `<en-GB>…</en-GB>` tags → **Next** → **Save and publish**. The new version code automatically supersedes the previous one; the old release is retired (no manual delete needed).
* **Testers update:** via Play Store (profile → Manage apps & device → Updates) or the opt-in link above. Google propagation takes **~15–60 min** after publish even though the console immediately says "available to testers".

## Commits this session (on `origin/main`)

* `32cf923f` — Fix white-screen-after-idle: robust session restore + RN token auto-refresh (HEAD, pushed, CI green)

Internal-testing **version code 5 (0.1.0)** is live and contains: journal-layout fix + white-screen fix + everything through `4aef5773`.

## What's left to do

* **Confirm the white-screen fix in the wild.** It only manifested after hours of idle, so it can't be verified instantly — watch that testers stop reporting blank screens on version code 5 over the next day. If anyone still hits it on v5, dig deeper (consider adding an ErrorBoundary — there is none anywhere in the app).
* **£3.99 purchase test STILL pending** (the long-standing #1 blocker). Console price is correct; now complete a **real purchase on version code 5** (a sideloaded APK can't do Play billing — must be the Play internal-testing build), confirm Pro unlocks and `restorePurchases` works. Do NOT tap Subscribe unless the sheet shows £3.99 / £29.99.
* Play store listing still **Draft** (description/screenshots); a **closed testing** track is required before production.
* Deferred/minor (carried forward): RevenueCat→Supabase webhook (server-side Pro enforcement only); `npm audit` 13 moderate; `pg_net` in `public` schema.
* Intentional, do NOT "fix": leaked-password protection is off on purpose (paid Supabase feature Richard isn't paying for).

## Gotchas (carried forward + new)

* **NEW: Windows `.git` lock files can be left behind and wedge git.** Committing from the sandbox left stale `index.lock` + `HEAD.lock`. Clear from PowerShell: `Remove-Item C:\dev\quiet-signal\.git\index.lock, C:\dev\quiet-signal\.git\HEAD.lock -Force`. LF→CRLF warnings on `git add` are harmless.
* **NEW: `git push` from PowerShell, not WSL.** GitHub credentials live in Windows Credential Manager (PowerShell git uses them automatically); WSL git has no creds and will prompt/fail.
* **NEW: `.aab` upload to Play Console can't be automated** (79 MB > browser upload-tool 10 MB limit) — the human drags/selects the file into the drop zone.
* Local Android builds must run in **WSL2** (`cd /mnt/c/dev/quiet-signal`), NOT PowerShell.
* **No EAS cloud builds** (out of credits). `--local` only; uses no build credits.
* Keep `project-notes/powershell..txt` OUT of every commit (line-ending noise). Two untracked handover `.md` files currently sit in `project-notes/` — commit them if you want them backed up.
* Tests/CI need **Node 22+** (built-in test runner + `--experimental-strip-types`).
* Supabase backend unchanged this session — no edge-function/schema/migration changes, nothing to redeploy. Deployed functions remain `nightly-journal-scan` v8, `generate-message` v6.

## Health check for a new chat

`npm run typecheck` → clean; `npm test` → 18/18; GitHub Actions "CI" → green (run #2, commit `32cf923`). Latest internal-testing release: **version code 5 (0.1.0)**.
