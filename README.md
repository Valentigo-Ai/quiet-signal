# Quiet Signal

MVP build against the full spec (Sections 1-11). Backend is live on Supabase; this repo is the Expo/React Native client plus a mirror of the deployed schema and edge functions.

## What's already live (Supabase project `bzczbsrtbnqiydscvnak`, region eu-west-2 / London, free tier, $0/month)

- Schema + RLS: `profiles`, `checkins`, `recipients`, `shared_messages`, `journal_entries`, `journal_insights` - every table has RLS, owner-only policies. Zero security-advisor findings at time of build.
- Edge functions deployed: `generate-message`, `share-checkin`, `get-shared-message` (public, token-based, no login), `nightly-journal-scan` (crisis-language safety check + sentiment/theme insights), `delete-account`.
- `pg_cron` + `pg_net` schedule `nightly-journal-scan` daily at 03:00 UTC.

## Required manual steps before this runs end-to-end

1. **Set the cron secret on the edge function.** A random `CRON_SECRET` value was generated and stored in Supabase Vault during setup so the cron job can authenticate to `nightly-journal-scan`. The MCP tooling used to build this couldn't set edge function *secrets* directly (only deploy function *code*), so you need to copy that value into the function's environment: Supabase Dashboard > Edge Functions > `nightly-journal-scan` > Secrets > add `CRON_SECRET`, or run `supabase secrets set CRON_SECRET=<value>` with the Supabase CLI. Ask in this session if you need the value re-surfaced from Vault (`select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret';`).
2. **Google OAuth** (optional sign-in method, Section 4.1) requires configuring a Google OAuth client in Supabase Auth settings - not done here since it needs external console credentials.
3. **Expo push tokens**: `share-checkin` sends via Expo's push API when a recipient's `contact_method` is `push`, but MVP defaults new recipients to `sms` (a `sms:` link handoff, no SMS vendor cost) since collecting a recipient's Expo push token requires the recipient to have the app installed and grant notification permission - wire this up once the recipient side of the app exists.
4. **Recipient no-login web view**: `web/index.html` is a static, dependency-free page that calls `get-shared-message`. Deploy it anywhere static (Vercel/Netlify/GitHub Pages/Supabase Storage) and update the push notification / SMS link to point at wherever you host it, instead of the raw edge function URL, if you want a nicer domain.

## Local setup

```bash
cp .env.example .env   # already has the live Supabase URL + anon key
npm install
npm run start           # then press 'a' for Android
```

Note: this repo was built in a sandboxed environment without npm registry access, so dependencies have **not** been installed or type-checked here. Run `npm install && npm run typecheck` on your machine before your first build to catch anything version-related.

## Structure

```
App.tsx                        - root component, wraps ThemeProvider/AuthProvider/RootNavigator
src/lib/                       - supabase client, theme tokens, crisis-check hook
src/context/                   - Auth + Theme React contexts
src/components/                - ScaleInput, PrimaryButton, CrisisBanner
src/screens/onboarding/        - welcome carousel, concerns, consent, sign up/in, first recipient
src/screens/home/              - CheckInScreen (core loop), ShareFlowScreen (the differentiator)
src/screens/history/           - trends + list view
src/screens/journal/           - private journal entry
src/screens/crisis/            - always-accessible crisis resources
src/screens/settings/          - recipients, privacy notice, export, delete account
supabase/migrations/           - mirror of what's applied to the live project
supabase/functions/            - mirror of what's deployed to the live project
web/index.html                 - recipient no-login view (static, no build step)
```

## Non-negotiables carried through the build (Section 10)

- Crisis-language check runs first, on every journal entry, before any other processing (`nightly-journal-scan`).
- Crisis resources are one tap away from the main tab bar, and shown automatically on next app open if a flag is set (`useCrisisCheck`).
- Full data export and account deletion are implemented (`DataExportScreen`, `DeleteAccountScreen` + `delete-account` function).
- No AI vendor anywhere - message generation and journal insights are template/rule-based and lexicon-based respectively.

## Still out of scope for MVP (Section 9)

Payments/subscription tiers, meditation/sleep content, group challenges, wearable integration, live AI chat.

See `Quiet-Signal-DPIA-Technical-Summary.docx` (one level up, in the outputs folder) for the data-protection technical summary to support the founder's DPIA.
