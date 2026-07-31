# Quiet Signal — Handover (Jul 31, session 7)

Continues from the Jul 28 session-6 handover. This session: fixed a real signup/login-lockout regression across three iterations (v49→v52), fixed a Pain check-in visibility bug, did a full investigation and multi-layer fix of a Pro entitlement bug (refunded RevenueCat subscriptions still granting Pro on restore), and is currently **mid-way through reconciling a broken migration history** — this repo had never been linked via the Supabase CLI before this session, and the remote database's migration bookkeeping doesn't match local files. That reconciliation is **not finished** — see "Where we stopped," below, first.

## What the app is

**Quiet Signal** — daily pain/anxiety/energy check-in app, Free and Pro tiers, RevenueCat subscriptions, Supabase backend, no AI vendor. See the session-6 handover for the full description, crisis-safety-net design, and the "never say clinical" wording constraint — all still true, not repeated here.

## Key identifiers

Same as session 6 (repo `C:\dev\quiet-signal` / `Valentigo-Ai/quiet-signal`, Supabase project `bzczbsrtbnqiydscvnak`, package `com.quietsignal.app`, RevenueCat project `4d31fc1f`), plus:

* RevenueCat **Secret API key** created this session: label `quiet-signal-server`, API version **V1**. Value should be set as Supabase secret `REVENUECAT_SECRET_API_KEY` — Richard did this via the Dashboard's Edge Function Secrets page, but **this was never explicitly confirmed back in-session as done**. Verify before assuming it's live.
* **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret: very likely still NOT set.** Richard was walked through the manual GCP Console steps (gcloud isn't installed on this machine) to create a service account with the Android Publisher API enabled, granted "View financial data, orders, and cancellation data survey responses" in Play Console (Users and permissions) plus per-app access to Quiet Signal specifically. No confirmation was given that this was completed. **Check this first** in the next session.
* **The RevenueCat secret key that was pasted into chat mid-session should be treated as compromised.** Richard pasted the live value (`sk_ausXPtlpCXEbblSIWxvwHnxfMLIRy` — recorded here only so it's unambiguous which one to check/rotate, not because it's safe to keep using) directly into the conversation twice while troubleshooting the CLI. He was told to rotate it. **Confirm whether that rotation actually happened** — if not, do it before relying on this integration for anything real.

## Standing facts (carry forward, don't re-ask)

Everything from session 6, plus:

* **`npx supabase <cmd>` works without a global install** (`supabase` alone is not on PATH on this machine; `npx` auto-installs 2.111.0 on first use).
* **Supabase CLI auth: use a Personal Access Token, not `supabase login`'s interactive browser pairing.** The pairing flow confused Richard and was abandoned last time. This time: generate a token at `https://supabase.com/dashboard/account/tokens`, set it with `$env:SUPABASE_ACCESS_TOKEN="..."` **in Richard's own PowerShell window**, then run CLI commands there. This worked.
* **Claude's Bash tool and Richard's PowerShell window are the same machine but separate shell processes — env vars don't cross.** `$env:SUPABASE_ACCESS_TOKEN` set in his PowerShell session is invisible to Claude's own Bash tool calls. This means: any Supabase CLI command that needs auth has to be **run by Richard himself**, with Claude preparing the exact command and reviewing pasted-back output — not run directly by Claude. Don't try to work around this by asking for the token; it defeats the point of using a token instead of pasting credentials.
* **Never ask Richard to paste secrets/keys into chat, even "to double check."** This session repeatedly had to catch itself doing exactly this. If a value must be verified, verify it a different way (read-only SQL query, checking behavior, checking a masked dashboard field) — never by having it typed into the conversation.
* **This repo had never been `supabase link`ed before this session.** First-ever link surfaced a materially out-of-sync migration history (see below) — assume nothing about local/remote migration parity going forward; verify with `migration list --linked` before trusting it.

## Corrections to earlier handovers

* **Session 6's gotcha "`.gitignore` is UTF-16 encoded... harmless" is no longer accurate — it's fixed.** `229b76af` rewrote it as plain ASCII. It had a literal UTF-16LE-encoded duplicate `dist.zip` entry embedded mid-file (bytes `d\0i\0s\0t\0.\0z\0i\0p\0`), almost certainly from an old PowerShell `>>` redirect. If it shows up as "binary" again in a future `git diff`, something re-introduced the corruption — don't just shrug it off as the known-harmless case again.

## v49→v52: onboarding bounce-back / login lockout (fixed, needs a build)

Three related bugs, same root architecture, fixed across three commits — **all still uncommitted-to-a-build**, no EAS build has been cut since these landed:

1. **`c5e9f832`** — signup bounced back to onboarding after account creation. Root cause: `AuthContext`'s `onAuthStateChange` listener auto-refreshes consent status on `SIGNED_IN`, racing `SignUpScreen`'s own profile-row upsert and reading it before the row existed. Fix: `setSuppressAutoConsentCheck` ref lets `SignUpScreen` own the correction.
2. **`3a5eed81`** — that fix only stopped the *stuck* bounce-back; a *brief flash* to onboarding remained, and separately `AddFirstRecipientScreen` (the true last onboarding step) could get torn down before ever rendering. Root cause: `RootNavigator`'s `showOnboarding` gate could flip to Main and back mid-flow, since `session`/`needsConsent` become individually-true at different, uncoordinated moments. Fix: new `onboardingActive` latch in `AuthContext`, set via `beginOnboardingFlow()` (email signup) or automatically when `needsConsent` goes true (first-time Google), released only by `AddFirstRecipientScreen.finish()` calling `markOnboardingComplete()`.
3. **`92cd3ee1`** — **this then broke login/signup entirely (v51 regression)**: the `onboardingActive` latch had no release path for a plain login, so anyone who'd ever started (and abandoned) a signup/Google-consent flow in the same app process got permanently stuck — subsequent logins authenticated fine against Supabase (200 OK every time in the logs) but the app never navigated anywhere, reading as "login is completely broken." Symptom looked like a client retry loop; it wasn't — same button tap, repeatedly, because nothing changed on screen. Fix: `signIn()`/`signInWithGoogle()` now clear the latch at their own start.

**Build-number mapping** (inferred from local `eas build --local` artifact timestamps vs. commit timestamps — these builds are NOT in EAS's cloud history at all; `eas build:list` returns nothing past 6 Jul for this project/account, meaning every build since then has been local-only):

| Version | Commit | Artifact (in repo root) |
|---|---|---|
| v49 | `c5e9f832` | `build-1785405947286.apk` |
| v50 | `3a5eed81` | `build-1785419975050.aab` |
| v51 | `1ea328e5` | `build-1785433437154.aab` |
| v52 | `92cd3ee1` | `build-1785439298150.aab` |

**No build has been cut since `92cd3ee1`.** Everything from the entitlement fix onward (below) is still only in source.

## Pain check-in section not gated on `presenting_concerns` (fixed, `1ea328e5`)

Unticking "Chronic pain" in Settings → What you're tracking correctly wrote `presenting_concerns` server-side, but `CheckInScreen.tsx` never had a `showPain` gate at all — Anxiety and PTSD were properly conditional (`showAnxiety`/`showPtsd`), Pain was hardcoded to always render. Fixed by adding `showPain` (defaults true when unanswered, matching pre-split behaviour) and threading it through the render, the required-field check, the upsert's 0-when-hidden fallback (matches `anxiety_score`'s existing convention — `pain_score` is `NOT NULL`), and `describeExisting`'s replace-confirmation copy.

## RevenueCat restore-purchase entitlement bug (fixed in code, NOT fully deployed)

**Repro** (Richard, `zargona2z@gmail.com`): tapped "Restore purchase," app granted Pro, even though the only order on the account (`GPA.3305-4426-3631-53464`) had been refunded via Play Console Order Management weeks earlier. Confirmed no new Play order was created — a stale-entitlement bug, not double-billing.

**Root cause, layered:**
1. `revenuecat-webhook`'s `computeIsPro` treated every `CANCELLATION` event identically ("keep Pro until natural expiry"), but a refund arrives as a `CANCELLATION` with `cancel_reason: "CUSTOMER_SUPPORT"` — RevenueCat has no distinct refund event type. A refund should revoke *immediately*, not wait for expiry. The function never even captured `cancel_reason`.
2. Deeper and unfixable in code alone: a refund issued **directly via Play Console Order Management** (not through RevenueCat) only reaches RevenueCat if Google Play Real-time Developer Notifications (Pub/Sub) are wired up between Google Play and the RevenueCat project. **Never verified whether this is actually configured** — it's a dashboard/GCP setting, flagged for Richard, not something checkable from the repo.
3. Architecturally: the app's Pro gating has always come straight from RevenueCat's client SDK (`CustomerInfo.entitlements.active`), which can only ever reflect what RevenueCat's own servers currently believe. `public.user_entitlements` (maintained by the webhook) was a write-only mirror **nobody read** — dead groundwork for a server-side enforcement (in `generate-message`) that was never wired up.

**Fixes, all in commit `0575366a`** (plus follow-ups `29f04bf3`, `229b76af` for unrelated migration hygiene surfaced while deploying this):

* `revenuecat-webhook/index.ts` — `computeIsPro` now takes `cancel_reason`; a refund-flagged `CANCELLATION` revokes immediately instead of granting the natural-expiry grace period.
* `proEntitlement.ts` — `hasProEntitlement` now asserts `.isActive === true` explicitly rather than relying implicitly on RevenueCat's "`.active` only ever holds truly-active entries" contract.
* **New edge function `verify-entitlement`** (NOT YET DEPLOYED — `supabase functions deploy verify-entitlement` has never been run) — authoritative server-to-server re-check, called from `ProContext.tsx` right after `purchasePro()`/`restorePurchases()` succeed. Re-fetches the subscriber from RevenueCat's REST API (secret key, never client-exposed) instead of trusting the client SDK's own result, then cross-checks the order directly against **Google Play's Voided Purchases API** — the one record a Play refund cannot fail to update, independent of whether RevenueCat itself was ever notified. Fails safe both ways: missing credentials or a transient error just falls back to prior behaviour, never denies a legitimate customer. Needs `REVENUECAT_SECRET_API_KEY` and `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (see Key identifiers above — both unconfirmed as actually set).
* `ProContext.tsx` — `public.user_entitlements` is now the actual **ongoing** gate, not just a purchase/restore-time check. New `serverIsPro` state, read on identity sync + app foreground, kept live via a Realtime subscription (`subscribeToEntitlementChanges`). `effectiveEntitled = serverIsPro ?? entitled` feeds `deriveIsPro`. RevenueCat's `CustomerInfo` listener is now explicitly secondary/optimistic — good for instant feedback, can no longer have the final say once the server value is known. `purchasePro()`/`restorePurchases()`'s existing verify-entitlement logic is untouched; they now additionally sync `serverIsPro` to their own confirmed result so a stale prior value can't outvote a just-completed purchase.
* **New migration `20260731100121_realtime_on_user_entitlements.sql`** — `alter publication supabase_realtime add table public.user_entitlements;`. Required because **no table in this project has ever been added to the Realtime publication before** — checked, confirmed absent. **Not yet applied to the remote database** — this is exactly what's blocked on the migration-history reconciliation below.

**For the account already affected** (`zargona2z@gmail.com`): none of this retroactively fixes what RevenueCat has cached for that customer specifically. Needs a manual entitlement revoke in the RevenueCat dashboard regardless of anything else here.

## Where we stopped — migration history reconciliation, IN PROGRESS

This surfaced purely because this session did the **first-ever** `supabase link`/`db push` for this repo. The remote database's migration bookkeeping table (`supabase_migrations.schema_migrations`) has version entries with no corresponding local files — near-certainly because past schema changes were applied through the Dashboard's SQL Editor rather than committed CLI migrations.

**Done so far, in order:**
1. `supabase migration repair --status reverted` for 8 phantom remote-only versions (`20260701144738 20260701145318 20260703093527 20260719074839 20260726152326 20260726152334 20260726155913 20260727075229`) — confirmed via Supabase's own docs this only deletes bookkeeping rows, no schema/data touched. Richard ran this.
2. `supabase db pull` then wanted `repair --status applied` for 9 versions matching local file date-prefixes, **including `20260731100121`** (our new, not-yet-run Realtime migration) — which must **never** be marked `applied` via repair, since that would tell the CLI it already ran without ever executing it.
3. Caught a real, independent bug while reviewing that list: **`20260701` was two different files sharing one version** (`20260701_initial_schema.sql` and `20260701_schedule_nightly_journal_scan.sql` both resolved to bare version `20260701` — a pre-existing collision from before later migrations switched to full 14-digit timestamps). Fixed by renaming the second one to `20260701235959_schedule_nightly_journal_scan.sql` (`29f04bf3`, local rename only, no schema change).
4. Richard ran `repair --status applied` for the corrected 8 versions (excluding `20260731100121`).
5. **Current blocker**: `db pull` now suggests `repair --status reverted 20260701` followed by `repair --status applied 20260701` again (plus still listing `20260731100121`, which is expected/correct to ignore). This smells like a checksum/content mismatch for version `20260701`, not a missing-row issue — **not yet diagnosed**. Two things in flight, unanswered:
   - Asked Richard to confirm whether he ran `git pull` (to fetch the `29f04bf3` rename) **before** running the repair batch in step 4 — if not, the collision may still have existed locally at that moment, which could explain a mismatch.
   - Asked Richard to run this **read-only** diagnostic directly in the Supabase Dashboard's SQL Editor (no CLI/token needed) and report back the result, before anyone runs the suggested revert-then-reapply:
     ```sql
     select version, name, statements
     from supabase_migrations.schema_migrations
     where version = '20260701';
     ```
   **Do not run any more `migration repair` commands for `20260701` until this comes back and is understood.** The `20260731100121` entry appearing in every `db pull` suggestion is fine and expected — it stops once `db push` actually executes it for real.

## What's left to do, in order

1. **Resolve the `20260701` checksum question above** — get the SQL Editor result, confirm whether it's the pull-ordering theory or genuine content drift, then decide the correct repair (or none).
2. Once `db pull` comes back clean (no repair suggestions), run `supabase db push` — expect it to apply **only** `20260731100121`. Confirm the output says exactly that.
3. Verify `REVENUECAT_SECRET_API_KEY` is actually set (Dashboard → Edge Function Secrets) — never explicitly confirmed this session.
4. **Rotate the RevenueCat secret key** if it hasn't been already — it was pasted into chat twice.
5. Finish `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`: GCP service account + Android Publisher API + Play Console "View financial data" grant + per-app access — walked through manually, completion unconfirmed.
6. `npx supabase functions deploy verify-entitlement` — never run yet.
7. Manually revoke Pro for `zargona2z@gmail.com` in the RevenueCat dashboard — the already-affected account, unfixable retroactively by any code change.
8. Confirm whether Google Play RTDN/Pub-Sub is wired to RevenueCat at all — if not, refunds issued outside RevenueCat may still be slow to reflect even after everything else above is done (the Voided Purchases cross-check in `verify-entitlement` is the mitigation for exactly this gap).
9. Cut a new build once all the above lands — nothing since `92cd3ee1` (v52) has shipped; v49-v52 plus the entire entitlement fix plus the migration/gitignore hygiene are all still only in source, none in a tested build.
10. Carried forward from session 6, still open: `£3.99` real-purchase RevenueCat test, `generate-message`'s `is_pro` enforcement (still deliberately off, per explicit instruction this session too — don't turn it on without being asked), closed-testing track / 12-testers requirement for Play production access, leaked-password protection, temporary app name for testers.

## Gotchas (new this session)

* **`eas build:list` shows nothing past 6 Jul for this project** — every build since has been `eas build --local`, invisible to EAS's cloud dashboard/API. If you need "what's actually been built," check the repo root for `build-*.apk`/`build-*.aab` files and cross-reference their embedded millisecond timestamps against commit times, not the EAS CLI.
* **No handover between session 6 (v43, Jul 28) and this one (Jul 31) exists** — sessions in between apparently ran without writing one. If build numbers/commits don't line up cleanly, that gap is why.
* **`supabase/.temp/` is real local CLI state** (project ref, pooler URL, component versions) created by `supabase link` — now gitignored, wasn't before. Machine-local, never commit it.
