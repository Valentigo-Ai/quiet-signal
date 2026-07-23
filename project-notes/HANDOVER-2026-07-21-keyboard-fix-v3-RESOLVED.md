Quiet Signal — Handover (2026-07-21, keyboard-covering-input bug: RESOLVED, confirmed on-device)

Richard has spent ~12 hours on this app today across multiple sessions/threads. This handover closes out the keyboard-covering-input bug thread (see `HANDOVER-2026-07-21-keyboard-fix-v2.md` for the detailed blow-by-blow of attempts 1-3 that led up to this — this doc picks up where that one left off and confirms the outcome). The separate Play Console launch-prep thread (`HANDOVER-2026-07-21-play-console-launch-prep.md`) is still untouched/open — not part of this bug, needs its own look tomorrow.

**Bottom line: the bug is fixed. Richard confirmed it on his real device — both the daily check-in note field and the Journal write screen behave correctly with the keyboard open, no covered text, no overlapping buttons. Version 16 (0.1.0) is live on Internal Testing and is the one he tested.**

KEY IDENTIFIERS (carry forward)
* Repo: `C:\dev\quiet-signal` / GitHub `Valentigo-Ai/quiet-signal` (branch `main`), HEAD is `64ef0a58`, pushed to `origin/main`.
* Package `com.quietsignal.app`; Play Console app id `4973719539259427979`; developer numeric id `7440677865943147994`; developer account "Cloud Seaker", signed in as `zargona2z@gmail.com`, Play Console login index `u/2`.
* Internal Testing opt-in link (persistent, always serves whatever's the latest release on that track): `https://play.google.com/apps/internaltest/4700064166027906652`
* Current Internal Testing "Latest release": **16 (0.1.0)** — this is the confirmed-working build.
* `eas.json` production profile has `autoIncrement: true` — it bumps the remote versionCode on *every* `eas build` invocation, success or failure. This session alone burned versionCodes 12, 13, 14 (all failed builds, see below) plus 15 and 16 (both succeeded and were uploaded). Don't be alarmed by "missing" version codes in Play Console history — that's expected, not a sign anything's wrong.
* Richard manually deleted 3 old releases from the Internal Testing release history during this session (his own action). Presumed cleanup of stray/failed draft entries; not independently verified which ones. Worth a glance next session if release history looks off, but nothing indicated a problem.

WHAT HAPPENED THIS SESSION (continuing from v2 handover)

1. **The architectural fix itself (commit `4466e353`, switch to `react-native-keyboard-controller`) was correct from the start** — see v2 handover for the full root-cause research on why attempts 1 and 2 failed (Android SDK 36 edge-to-edge makes `adjustResize` behave like `adjustNothing`). The rest of this session was entirely build/deploy plumbing and one follow-on layout bug — not a wrong diagnosis.

2. **Local build kept failing with "No space left on device" — this was a red herring chase that ate most of the session.** In order, all things that were tried and did *not* fix it:
   - Windows Disk Cleanup (`cleanmgr /sagerun`, system files) — only ever found <1GB reclaimable, no previous-Windows-installation leftover on this machine.
   - Compacting the WSL2 virtual disk via `diskpart` (`wsl --shutdown`, find vhdx path via `Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss\*"`, then `select vdisk file=...` / `attach vdisk readonly` / `compact vdisk` / `detach vdisk`) — legitimate technique, reclaimed several GB, didn't fix the build.
   - Richard manually uninstalling Age of Empires III & IV and Call of Duty (base + Modern Warfare II) to free real disk space, taking C: from 33GB to 273GB+ free — build **still failed**, just slightly further into the build each time.
   - **Actual root cause**: WSL2's `/tmp` is mounted as `tmpfs` (RAM-backed), only **4.9GB total** in this environment (`df -h /tmp` to check). `eas build --local` extracts and builds the *entire* native Android project under `/tmp/<user>/eas-build-local-nodejs/...` by default — completely unrelated to the Windows C: drive or the WSL virtual disk's actual free space. Every "No space" failure was hitting that 4.9GB RAM-backed ceiling.
   - **The actual fix**: redirect the build's temp directory off tmpfs and onto the real disk via `TMPDIR`:
     ```bash
     mkdir -p ~/eas-tmp
     TMPDIR=~/eas-tmp eas build --platform android --profile production --local
     ```
     Node (and the JVM/Gradle underneath it) respect `TMPDIR` on Linux. This is now the standard way to run local builds on this machine — **use `TMPDIR=~/eas-tmp` on every future `eas build --local` invocation on this WSL setup**, don't rediscover this. Worth considering a shell alias or a one-line note in the repo (e.g. README or a `scripts/build-local.sh` wrapper) so this isn't lost.
   - Lesson for next time this error shows up: check `df -h /tmp` *first*, before touching Windows disk space at all.

3. **First successful build (version 15) exposed a second, unrelated bug** on the Journal screen: with the keyboard open, "Show saved entries" visually overlapped/covered the "Save entry" button. The core keyboard-covering-input bug *was* actually fixed at this point (the write box itself was correctly visible above the keyboard) — this was a new, narrower layout defect, not a sign the main fix failed.
   - **Root cause**: `styles.writeSection` in `src/screens/journal/JournalScreen.tsx` was `{ flex: 1 }` with no `minHeight: 0`. This is a classic flexbox/Yoga gotcha: a `flex: 1` child refuses to shrink below its own content's intrinsic min-size unless `minHeight: 0` is explicitly set. When the keyboard opened and the surrounding `flex: 1` container shrank to fit above it, the `KeyboardAwareScrollView` (holding the fixed-height 220px `TextInput` + the Save entry button, ~300px total) held its ground instead of shrinking, so the disclosure row sibling below it (`"Show saved entries"`) got pushed into/over the button rather than the ScrollView properly shrinking and scrolling its own content internally.
   - **Fix (commit `64ef0a58`)**: added `minHeight: 0` to `writeSection`. One-line change, fully commented in the source.
   - `src/screens/home/CheckInScreen.tsx` does **not** have this bug — its `KeyboardAwareScrollView` wraps the *entire* screen's content with no competing flex siblings, so there's nothing for it to overlap. No fix was needed there. **Worth a mental note**: if any *other* screen in the app has a `KeyboardAwareScrollView` (or any `flex: 1` view) that sits next to sibling views in a flex column, the same class of bug could be lurking there too, just not yet triggered. Not urgent, but worth a quick grep (`grep -rn "KeyboardAwareScrollView" src/screens`) next time keyboard-related layout work happens.
   - This fix required connecting the `C:\dev\quiet-signal` folder directly (via `request_cowork_directory`) in this Cowork session to read/edit the file, since the session doesn't have file access by default.

4. **Second build (version 16, same `TMPDIR` fix) succeeded, was uploaded and published to Internal Testing.** Richard tested on his real device and confirmed: **"it works perfect thank you."** Both the check-in note field and the Journal write screen now behave correctly with the keyboard open — no covered input, no overlapping buttons.

GIT / REPO STATE
* HEAD: `64ef0a58` ("Fix Save entry/Show saved entries overlap on Journal screen"), pushed to `origin/main`. This commit also carries `package-lock.json` (left uncommitted from the earlier `npm install` for `react-native-keyboard-controller`/`reanimated`/`worklets` — now locked down correctly for reproducibility).
* `git log --oneline -6`:
  ```
  64ef0a58 Fix Save entry/Show saved entries overlap on Journal screen
  4466e353 Fix keyboard covering inputs: switch to react-native-keyboard-controller
  3191790a Rework keyboard-covering fix using explicit keyboard height tracking
  9e7ad5ef Fix keyboard covering text inputs on check-in and journal screens
  9e1a2ef8 Add email-code password reset (dormant until custom SMTP configured)
  4ec316e2 Add top-level ErrorBoundary to prevent white-screen crashes
  ```
* Remaining `git status --short` — all pre-existing, unrelated to this bug, explicitly scoped out per Richard's repeated instruction across multiple sessions. Don't bundle these into future commits without being asked:
  ```
   M README.md
   M docs/crisis-wordlist-review.md
   M project-notes/powershell..txt
   M web/index.html
  ?? project-notes/HANDOVER-2026-07-19-revenuecat-webhook.md
  ?? project-notes/HANDOVER-2026-07-21-play-console-launch-prep.md
  ?? project-notes/HANDOVER-2026-07-21-keyboard-fix-v2.md
  ```

GOTCHAS — CARRY FORWARD (new this session)
* **`TMPDIR=~/eas-tmp` on every local build going forward** (see above) — this is the single most important thing to remember from today. Without it, `eas build --local` will eventually hit the same 4.9GB tmpfs wall again once enough build artifacts accumulate.
* A `flex: 1` view in React Native does **not** shrink below its content's intrinsic min-size unless `minHeight: 0` (or `minWidth: 0` in a row) is explicitly set. Relevant anywhere a scroll view or flex child needs to coexist with siblings in a shrinking container (e.g. keyboard-open states).
* Cross-machine git operations run through this Cowork session's mounted-folder bash tool can leave stray `.git/HEAD.lock` / `.git/index.lock` files behind that can't be deleted from the sandbox side (a permissions quirk on the Windows↔sandbox mount). If git commands start failing with "Unable to create '.git/index.lock': File exists," the human needs to delete those two files manually from PowerShell (`Remove-Item C:\dev\quiet-signal\.git\HEAD.lock, C:\dev\quiet-signal\.git\index.lock`) before any git command will work again.
* Age of Empires III & IV and Call of Duty (base + Modern Warfare II) were uninstalled from this machine during the (ultimately unnecessary, but harmless) disk-space chase. Noting in case Richard is surprised to find them gone later or wants to reinstall.

GOTCHAS — CARRIED FORWARD FROM EARLIER SESSIONS (still true)
* Local Android builds: WSL2 only (`cd /mnt/c/dev/quiet-signal && TMPDIR=~/eas-tmp eas build --platform android --profile production --local`). PowerShell fails ("Unsupported platform"). No EAS cloud builds (out of credits) — `--local` only.
* `git push` from PowerShell, not WSL (GitHub creds live in Windows Credential Manager).
* `.aab` upload to Play Console is manual (file size exceeds Claude's browser-upload tooling's ~10MB cap) — Richard drags/selects the file himself from `C:\dev\quiet-signal\build-<timestamp>.aab`.
* No native `android`/`ios` folders in the repo — fully managed Expo workflow (Continuous Native Generation). `eas build --local` regenerates the native project from `app.json`/`package.json` on every build.
* Provider order in `App.tsx`: `KeyboardProvider` wraps everything; inside that, `ErrorBoundary` wraps `ThemeProvider` wraps `ProProvider` wraps `AuthProvider`. Keep this order if refactoring.
* Tests/CI need Node 22+ (Richard's WSL node is v20.20.2 — works fine for builds, just triggers harmless `EBADENGINE` warnings on `@supabase/*` packages during install).

NOT DONE / OPEN FOR TOMORROW
1. The separate Play Console launch-prep checklist (`HANDOVER-2026-07-21-play-console-launch-prep.md`) is untouched by this thread — still needs review.
2. Optional: grep the codebase for other `KeyboardAwareScrollView` usages sitting next to flex siblings, in case the same `minHeight: 0` class of bug exists elsewhere unnoticed.
3. Optional: turn `TMPDIR=~/eas-tmp eas build ...` into a small wrapper script or documented alias so it's not forgotten on the next local build.
4. Optional: double check the 3 deleted Play Console releases didn't remove anything Richard cared about (low concern, wasn't independently verified).

VERIFY IN A NEW CHAT (health check)
* `git log --oneline -3` should show `64ef0a58` at the top.
* Play Console → Internal testing → Releases → "Latest release" should show **16 (0.1.0)**, "Available to internal testers".
* If the keyboard bug or a button-overlap bug resurfaces on some *other* screen: don't reach for a manual JS keyboard-height fix — the working pattern is `KeyboardAwareScrollView` from `react-native-keyboard-controller` (already installed and proven), just make sure any `flex: 1` wrapper around it also has `minHeight: 0`.
