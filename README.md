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
4. **Set the `RECIPIENT_WEB_URL` secret.** `web/index.html` (the recipient no-login view) is deployed and live at `https://quietsignal.co.uk/share/` - the last remaining step is Dashboard > Edge Functions > `share-checkin` > Secrets > add `RECIPIENT_WEB_URL=https://quietsignal.co.uk/share/` (same pattern as `CRON_SECRET` above), so shared links point recipients at the real page instead of the raw JSON endpoint. `share-checkin` already falls back gracefully if this isn't set yet, so nothing is broken in the meantime.

## Website (quietsignal.co.uk) - status: live

The full WordPress site is built and published, using the default Twenty Twenty-Five block theme (kept over Astra per Richard's call - no page-builder plugin needed for a simple 4-page brochure site):

- **Home** (`/`) - hero, what it does, share/data-privacy sections. Set as the static front page.
- **About** (`/about/`) - why the app exists, who it's for, Pro explainer.
- **Support** (`/support/`) - contact email, "not a crisis service" notice, FAQ.
- **Privacy Policy** (`/privacy-policy/`) - populated WordPress's own auto-created Privacy Policy page (not the static `web/privacy-policy.html` file, to avoid duplicate content) and set it as the site's designated privacy page under Settings > Privacy. **Update `docs/store-listing.md` and any App/Play Store submission forms to use this URL, not the old `/privacy-policy.html` one.**
- Site title/tagline set to "Quiet Signal" / "A quiet way to say how you're doing.", nav menu ordered Home/About/Support/Privacy Policy, WordPress + Site Address URLs switched to `https://` (Hostinger SSL confirmed active), static front page set in Settings > Reading.
- `web/index.html` (recipient share view) is uploaded and live at `https://quietsignal.co.uk/share/`.
- `web/privacy-policy.html` in this repo is now unused/superseded by the live WordPress page above - kept for reference only.
- **Visual redesign (brand pass)**: replaced the default Twenty Twenty-Five black/white styling with the app's actual brand - custom color palette (Cream `#F6F1EB`, Terracotta `#8A6552`, Dark Text `#2B2622`, plus Rose/Gold/Sage icon accents) applied to backgrounds, text, links, buttons, and headings; Fraunces (Semi Bold, headings) + Karla (body) installed via the native Font Library/Google Fonts integration, matching the app's own typography. Every page now uses full-bleed Cover-block hero photography pulled from the app's own `assets/backgrounds/` library (sunbeam-mountain-lake, quiet-dock-sunset, azalea-garden-falls, misty-forest-lake, resting-in-the-grass, dew-spiderweb) with white rounded content cards instead of plain text blocks. The default Footer Columns pattern (WordPress's placeholder "Stories"/"Fleurs" demo links) was replaced with a working, branded footer (nav + crisis disclaimer + copyright). Site icon/favicon set to the app's own ring-and-dot icon. All four pages use a custom "Home (no title)" template (Header + Content + branded Footer, no redundant Post Title block) to avoid duplicate headings above each hero.

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

## Brand

**Icon** (`assets/brand/icon.png`, `assets/brand/adaptive-icon.png`) - three concentric rings rising from a single dot on a deep navy field. The rings are hope reaching outward toward a brighter future; the dot at the center is the person sending it. Rings are tinted in a soft, muted three-tone sweep (periwinkle `#A7B4E8`, gold `#F3C77C`, mint `#7FC7AE`) - deliberately not the pride-flag palette (that's 6 fully-saturated colours in horizontal stripes; this is 3 muted tones in concentric rings, no red or orange) - chosen because a solid-colour icon with a distinctive multi-tone mark stands out further in a store/home-screen grid than the single-flat-colour convention most wellness apps use (Calm's blue circle, Headspace's orange circle), while keeping the bold contrast that research shows drives tap-through. Background `#0B1128`, dot `#EEF1FC`. (Note: this is the icon actually shipped in the repo - it supersedes an earlier terracotta-on-cream direction that was drafted but never became the final asset.)

**Splash** (`assets/brand/splash.png`) - the same ring-and-dot mark, on the same deep-navy background as the icon, centered on the app's actual background colour so there's no colour jump between splash and first screen.

**Typography** - Fraunces (headline/serif) + Karla (body/UI), loaded via `@expo-google-fonts/*` in `App.tsx` (`useAppFonts.ts`) and referenced as `fonts.heading` / `fonts.body` / `fonts.bodyBold` in `src/lib/theme.ts`. Applied to every screen title, the primary button label, price text, and the pain/anxiety/energy scale labels.

## Non-negotiables carried through the build (Section 10)

- Crisis-language check runs first, on every journal entry, before any other processing (`nightly-journal-scan`).
- Crisis resources are one tap away from the main tab bar, and shown automatically on next app open if a flag is set (`useCrisisCheck`).
- Full data export and account deletion are implemented (`DataExportScreen`, `DeleteAccountScreen` + `delete-account` function).
- No AI vendor anywhere - message generation and journal insights are template/rule-based and lexicon-based respectively.

## Still out of scope for MVP (Section 9)

Payments/subscription tiers, meditation/sleep content, group challenges, wearable integration, live AI chat.

See `Quiet-Signal-DPIA-Technical-Summary.docx` (one level up, in the outputs folder) for the data-protection technical summary to support the founder's DPIA.
