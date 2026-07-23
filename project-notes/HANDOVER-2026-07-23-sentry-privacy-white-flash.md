# Quiet Signal — Handover (2026-07-23, session 2: Sentry wired in, privacy updated, white-flash fixed — v18 build pending overnight v17 verdict)

For what Quiet Signal is, launch-readiness status, and key identifiers, see
`HANDOVER-2026-07-23-white-screen-cold-start.md` (same day, session 1). This
handover covers the follow-on session only.

## BOTTOM LINE

Three pieces of work shipped to `main` (all pushed except the last three
commits — see "Repo state"): (1) Sentry crash reporting fully wired in,
errors-only, EU region, disabled in dev; (2) privacy disclosure for crash
data added in all four places it needed to be (in-app notice, repo policy
page, live WordPress site, with the Play data-safety form still pending);
(3) the launch white-flash (splash → white gap → first screen) root-caused
and fixed. None of this is on-device yet: it all lands in the **v18 build,
which is deliberately NOT built yet** — the overnight v17 cold-start test
(white-screen bug) must be confirmed first so the two variables aren't
conflated.

## SENTRY — KEY FACTS

- Account: Richard's, created this session at sentry.io (email login,
  cunninghamr76@gmail.com). Org slug `valentigo`, project `react-native`,
  **EU data storage region** (`.ingest.de.sentry.io`).
- DSN (publishable, hardcoded by design): in `src/lib/sentry.ts`.
- Free Developer plan: 5K errors/mo, 1 user, 30-day retention. The 14-day
  "trial" banner just means trial of paid features; it falls back to free
  automatically. Leaked-password-protection-style upsells: ignore.
- Config: `@sentry/react-native` 7.2.0 (Expo SDK 54's blessed version, from
  `bundledNativeModules.json`). Expo config plugin in `app.json` (org
  `valentigo`, project `react-native`, url `https://sentry.io/`). New
  `metro.config.js` wraps `getSentryExpoConfig` for debug IDs/symbolication.
- Privacy posture (deliberate, this is a mental-health app): `sendDefaultPii:
  false`, `tracesSampleRate: 0` (errors only — no tracing/replay/profiling),
  `enabled: !__DEV__`. Init happens in `App.tsx` at module scope **before the
  font gate**, and the root export is `Sentry.wrap(App)` — both chosen to
  cover the exact blind spot the v17 white-screen bug lived in (above
  ErrorBoundary, above the `return null` font gate).
- Source-map upload during build needs `SENTRY_AUTH_TOKEN` in the build env —
  NOT set up yet. Without it the build still works; Sentry just shows
  minified stack traces. Set it up when convenient (Sentry → Settings → Auth
  Tokens), export in the WSL2 shell before `eas build --local`.
- Sentry dashboard sits at "Waiting for error" until a v18 build sends its
  first event. That is normal, not broken.

## PRIVACY DISCLOSURE — WHERE IT NOW LIVES

1. `src/constants/legalCopy.ts` (`PRIVACY_NOTICE_MARKDOWN`) — in-app notice.
2. `web/privacy-policy.html` — repo copy (kept in sync per its header rule).
3. **Live WordPress page** quietsignal.co.uk/privacy-policy — edited via
   browser this session (Classic Editor block) and verified live: date →
   23 July 2026, "Crash and error data" item in §2, clarifying sentence on
   the no-analytics line, Sentry added to the §6 subprocessor list.
4. NOT YET: Play Console data-safety form — must declare crash-data
   collection (device/app identifiers-ish diagnostics, no health data) when
   launch-prep unblocks it (it's behind reviewer sign-in details + target
   audience questionnaire).

## WHITE FLASH ON LAUNCH (splash → white → app) — FIXED, commit `0d8d40b7`

Root cause: `App.tsx` hid the splash the moment fonts loaded, but
`RootNavigator` `return null`s while auth restores the session, so the bare
white window showed until the first screen painted. Three-layer fix:
splash now hides in `NavigationContainer onReady` (8s safety-net timeout in
App.tsx so it can never stick — same philosophy as the font-load timeout);
navigation theme background/card set to app midnight colors (DefaultTheme
is white); `app.json` root `backgroundColor: "#0B1128"` so the native
window itself is navy. Verification: on-device in v18.

## DEEP-DIVE AUDIT RESULTS (this session)

- Sentry integration: `npx expo config --type prebuild` exits 0 and resolves
  the plugin; metro config loads; `npm ls` tree consistent; lockfile synced.
- Core non-negotiables intact: crisis check first in `nightly-journal-scan`
  (shared `_shared/crisisWordlist.ts`), Crisis Resources one-tap tab,
  DataExport/DeleteAccount screens present, zero AI-vendor references.
- Supabase (project `bzczbsrtbnqiydscvnak`, eu-west-2, healthy): all 7 edge
  functions active; both nightly jobs (journal scan v9, checkin archive v4)
  ran clean overnight with 200s. Advisors: (a) leaked-password protection
  off — **known, deferred: paid-plan feature, Richard's decision, do not
  re-raise as a to-do**; (b) `under_free_recipient_limit()` SECURITY DEFINER
  callable by authenticated — looks intentional (free-tier recipient limit),
  unreviewed.
- Previously-uncommitted work from older sessions committed this session:
  recipient support-note in `web/index.html` (`aa71d21c`, Samaritans
  guideline 4 — findahelpline.com footer on the shared-checkin page; note
  this page still needs DEPLOYING wherever web/index.html is hosted) and
  README/crisis-doc corrections (`4d16f514`).

## REPO STATE / GOTCHAS

- HEAD after this session: handover commit on top of `4d16f514` ←
  `aa71d21c` ← `0d8d40b7` ← `447047fb` (privacy) ← `c0fc1550` (Sentry) ←
  `0aa9c16c` (v17 fix, pushed earlier). Everything up to `447047fb` pushed;
  Richard pushes the rest from PowerShell (`git push`) — sandbox has no
  GitHub credentials, this is normal.
- `.git/index.lock` recurrence: SOLVED for cowork sessions — the sandbox
  couldn't delete files on the mount; calling the cowork
  `allow_cowork_file_delete` permission tool once per session fixes it.
  `rm -f .git/*.lock` before git ops still a sensible habit.
- npm installs from the sandbox: background processes die between bash
  calls, and full `npm install` exceeds the 45s call timeout. Working
  pattern: install into a temp dir with `--legacy-peer-deps
  --ignore-scripts`, copy packages into `node_modules`, verify file counts
  match, edit `package.json` manually, then `npm install --package-lock-only`
  (fast). `@sentry/cli-linux-x64` binary is Linux-flavored in node_modules —
  irrelevant, Richard builds in WSL2 (Linux) and EAS installs fresh anyway.
- Typecheck/tests in sandbox: `timeout 40 npx tsc --noEmit` ≈ borderline but
  passes; `npm test` fast (18 tests, all passing as of this session).

## NEXT SESSION, IN ORDER

1. **Overnight v17 verdict** (white-screen bug). If clean → build v18 in
   WSL2 (`TMPDIR=~/eas-tmp eas build --platform android --profile production
   --local`), bump versionCode, upload to Internal Testing — v18 carries
   Sentry + white-flash fix + recipient support note. If v17 white-screens
   again → v18 anyway (Sentry will catch it next time) + consider `adb
   logcat` capture.
2. Verify on v18: no white flash on cold start; Sentry receives a test event
   (Sentry's onboarding "Waiting for error" page will confirm receipt).
3. Deploy updated `web/index.html` (recipient support note) to wherever the
   share page is hosted (`RECIPIENT_WEB_URL` — re-verify this secret while
   there, per session-1 handover).
4. Launch-prep checklist unchanged from session-1 handover (reviewer
   sign-in details first — needs Richard personally). Add: crash-data
   disclosure in the data-safety form when it unblocks.
5. Optional: `SENTRY_AUTH_TOKEN` for symbolicated traces; guard
   `CrisisCountryContext`'s unguarded AsyncStorage call (still open from
   session 1).
