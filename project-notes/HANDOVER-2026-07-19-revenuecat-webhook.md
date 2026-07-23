Quiet Signal — Handover (2026-07-19, RevenueCat→Supabase webhook + server-side Pro plumbing)

Continuation of the 2026-07-19 white-screen-fix handover. This session did three "deferred/minor" items and, in the course of the webhook one, wired the client identity + shipped a new build. Everything below is committed and pushed to `origin/main` (commit `00deda22`), and the app-side change ships in internal-testing version code 6. Backend changes (one migration + one new edge function) are applied to the remote Supabase project.

KEY IDENTIFIERS (carry forward)
* Repo: `C:\dev\quiet-signal` / GitHub `Valentigo-Ai/quiet-signal` (branch `main`)
* Supabase project: `quiet-signal`, id `bzczbsrtbnqiydscvnak` (eu-west-2)
* App package `com.quietsignal.app`; Play Console app id `4973719539259427979`; developer account "Cloud Seaker" id `7440677865943147994`, signed in as `zargona2z@gmail.com`, Play Console login index u/2
* Internal testing track id: `4700064166027906652`; opt-in link: `https://play.google.com/apps/internaltest/4700064166027906652`
* RevenueCat: project id `4d31fc1f`, entitlement identifier `pro`, products `quiet_signal_pro_monthly` / `quiet_signal_pro_yearly`
* NEW — RevenueCat webhook integration id `whintgr78e81fd927` ("Supabase Pro entitlement sync")
* NEW — Supabase edge function `revenuecat-webhook` id `d04d8196-53d5-43a2-9259-b066b9c0dad4` (v1, verify_jwt=false)
* NEW — Webhook shared secret (Supabase secret `REVENUECAT_WEBHOOK_SECRET`, also set as the RevenueCat Authorization header): `rcwh_a8a06b4a9c487833443b965e5b0f0ecb50ba23a7fdb27c24`

WHAT WAS DONE THIS SESSION (in order)
1. pg_net schema — NO ACTION NEEDED. The old "pg_net in public schema" note was stale: it's already in the `extensions` schema (verified via pg_extension catalog + security advisor). Only remaining security advisor is `auth_leaked_password_protection` (intentionally off — paid feature Richard isn't paying for; do NOT "fix").

2. npm audit — 0 vulnerabilities. All 13 moderate findings came from two build-tool transitive deps (`postcss` <8.5.10 XSS, `uuid` <11.1.1 bounds check), both pulled in via Expo. `npm audit fix --force` wanted expo@57 (three SDK majors up from our expo ^54 / RN 0.81.5 — breaking, rejected). Instead added targeted `overrides` in package.json: `"postcss": "^8.5.10"`, `"uuid": "^11.1.1"`. Verified safe: postcss is a minor bump; `xcode` (the only uuid consumer) calls just `uuid.v4()`, still exported in v11, and was never on the vulnerable path. Regenerated the committed lockfile with `npm install --package-lock-only` (resolved postcss 8.5.19, uuid 11.1.1). node_modules untouched by me — Richard ran `npm install` in WSL2 as part of the build.

3. RevenueCat → Supabase webhook (server-side Pro enforcement PLUMBING; enforcement itself is deliberately OFF). Discovered the hard prerequisite: the app called `Purchases.configure()` with NO `logIn()`, so RevenueCat assigned anonymous app_user_ids the backend couldn't map to accounts. Built all three coupled pieces:
   * DB: table `public.user_entitlements` (migration `create_user_entitlements`, file `supabase/migrations/20260719_user_entitlements.sql`). PK `user_id` -> auth.users(id), columns `is_pro, product_id, store, environment, expires_at, last_event_id, last_event_at, updated_at`. RLS on; owner-can-select policy only; no write policies (service-role webhook only writes).
   * Edge function `revenuecat-webhook` (`supabase/functions/revenuecat-webhook/index.ts`, deployed v1, verify_jwt=false). Shared-secret auth via Authorization header; maps `event.app_user_id` (=Supabase uid) to a row; derives is_pro from event type + `expiration_at_ms`; ordering guard (`last_event_at`) + idempotency (`last_event_id`); ignores anonymous/non-UUID ids and non-"pro" entitlements; FK-violation (deleted user) acknowledged, not retried.
   * Client: `src/context/ProContext.tsx` now runs `Purchases.logIn(supabaseUserId)` on restored session + auth changes, `Purchases.logOut()` on sign-out (guarded by an identifiedRef; subscribes to `supabase.auth.onAuthStateChange`, unsubscribes on unmount). This makes RevenueCat app_user_id == auth.users.id. Ships in version code 6.
   Config completed live (via browser): Supabase secret set; RevenueCat webhook created (URL above, both Production+Sandbox, All events, HMAC disabled). "Send test event" returned 200 from our function (confirmed via response CORS headers `POST, OPTIONS` + `sb-project-ref`). Test wrote no row (fake user -> FK skip), as designed.

4. Build + ship. Verified locally: `npm run typecheck` clean, `npm test` 18/18, plus a standalone 10/10 check of the webhook's is_pro decision logic across event types. Richard built version code 6 in WSL2 (`build-1784448951408.aab`, 78.4 MB), committed+pushed from PowerShell (`00deda22`), and published to internal testing (Jul 19 9:23 AM, release "6 (0.1.0)").

COMMITS THIS SESSION (on origin/main)
* `00deda22` — RevenueCat webhook + logIn wiring + npm audit overrides (9 files: package.json, package-lock.json, src/context/ProContext.tsx, supabase/functions/revenuecat-webhook/index.ts, supabase/migrations/20260719_user_entitlements.sql, + 4 handover/notes .md incl. project-notes/revenuecat-webhook-setup.md). HEAD, pushed.

WHAT'S LEFT TO DO
* £3.99 PURCHASE TEST — STILL the #1 blocker, now unblocked end-to-end. On version code 6 (Play internal-testing build, not a sideload), complete a real purchase (only tap Subscribe if the sheet shows £3.99 / £29.99), confirm Pro unlocks in-app AND that a row lands in `public.user_entitlements` with `is_pro=true` for that user. Also confirm `restorePurchases` works. (SQL: `select user_id, is_pro, product_id, expires_at, last_event_at from public.user_entitlements;`)
* TURN ON ENFORCEMENT (later, after the purchase test proves rows populate). Nothing server-side rejects non-Pro callers yet — record-only by design. Next step: add an is_pro check (read `user_entitlements`) to the `generate-message` edge function (the premium AI path) so it 403s non-Pro. There is currently no server enforcement anywhere.
* Confirm the white-screen fix in the wild (carried from prior handover): watch that testers stop reporting blank screens now that v5/v6 are out. If it recurs, consider adding an ErrorBoundary (there is none anywhere in the app).
* Play store listing still Draft (description/screenshots); a closed testing track is required before production.
* Deferred/minor now CLEARED: npm audit (done), pg_net (already fine). Still open: RevenueCat→Supabase webhook is built but see "turn on enforcement"; `pg_net` fine; leaked-password intentionally off.

VERIFY IN A NEW CHAT (health check)
* `npm run typecheck` -> clean; `npm test` -> 18/18. GitHub Actions "CI" on `00deda22` — NOT yet confirmed this session; check it's green.
* Supabase: edge functions now include `revenuecat-webhook` v1 alongside `nightly-journal-scan` v8, `generate-message` v6, etc. Table `user_entitlements` exists (starts empty until first real purchase).
* Latest internal-testing release: version code 6 (0.1.0).

GOTCHAS (carried forward + still true)
* Local Android builds: WSL2 only (`cd /mnt/c/dev/quiet-signal && eas build --platform android --profile production --local`). PowerShell fails ("Unsupported platform"). No EAS cloud builds (out of credits) — `--local` only. Command to enter WSL from PowerShell is `wsl` (not `wsl2`). ~8–10 min build; version code auto-increments.
* `git push` from PowerShell, not WSL (GitHub creds live in Windows Credential Manager). LF->CRLF warnings on `git add` are harmless.
* `.aab` upload to Play Console is manual (79 MB > browser 10 MB upload cap) — human drags/selects the file. Multiple old `.aab`s sit in the repo root; pick the newest by timestamp.
* If git wedges on a lock: PowerShell `Remove-Item C:\dev\quiet-signal\.git\index.lock, C:\dev\quiet-signal\.git\HEAD.lock -Force`.
* Tests/CI need Node 22+ (built-in test runner + `--experimental-strip-types`).
* To rotate the webhook secret, change BOTH the Supabase secret and the RevenueCat Authorization header together.
* Provider order in App.tsx: ProProvider wraps AuthProvider, so ProContext can't use the Auth hook — that's why ProContext subscribes to `supabase.auth` directly. Keep that if refactoring.
* Backend otherwise unchanged: no schema/edge changes beyond `user_entitlements` + `revenuecat-webhook` this session.
