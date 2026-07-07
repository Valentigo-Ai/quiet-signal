# Quiet Signal — Project Status Handoff

Owner: Richard (cunninghamr76@gmail.com). Local repo: `C:\dev\quiet-signal`. GitHub: `https://github.com/Valentigo-Ai/quiet-signal.git`. Supabase project: `quiet-signal` (id `bzczbsrtbnqiydscvnak`, region eu-west-2, free tier).

Note on wording: avoid describing this as a "clinical" anything (even negated, e.g. "non-clinical mental health app") in external copy or summaries — "clinical" is a legally sensitive word for this product. Internal code comments saying "not clinical" / "never clinical" are fine and intentional.

## What this is

**Quiet Signal** is a daily pain/anxiety/energy check-in app: a person logs a quick check-in plus an optional note, can share a simple honest status with someone they trust (no login required for the recipient), gets weekly personal-reflection insights from their own journal entries (sentiment + themes, framed as a reflection aid, never diagnostic), and can export their own history as a PDF. There's a free tier and a Pro tier (unlocks a large library of background photos, longer history, etc. — real payment processing is not wired up yet, see below). Explicitly **not** a crisis service or medical device — it has a mandatory crisis-language safety net that excludes anything flagged from insights and shows a Crisis Resources screen, but never tries to respond to or assess a crisis itself.

Stack: Expo / React Native (mobile) with a web export of the same app, Supabase for backend (Postgres + RLS, Edge Functions, pg_cron), no AI vendor anywhere in the product (sentiment/theme detection is lexicon/regex-based, on purpose).

**Two deployed surfaces:**
- **The app** — mobile via Expo Go / eventual store builds, plus a web build hosted at `https://quietsignal.co.uk/app/`.
- **The marketing website** — WordPress (Twenty Twenty-Five theme) at `https://quietsignal.co.uk/`, hosted on Hostinger. Home / About / Support / Privacy Policy pages, branded to match the app (Cream/Terracotta/Dark Text palette, Fraunces + Karla fonts, hero photography from the app's own background library).

## What's been done (this session)

**Web app deployment (was broken, now fixed and verified live):**
- Root cause: Expo's web export used absolute root paths (`/_expo/...`) which 404'd because the site's actual root is WordPress, not the app — it's hosted in a `/app/` subfolder.
- Fix: added `"experiments": { "baseUrl": "/app" }` to `app.json`, rebuilt, redeployed to Hostinger's `public_html/app/`.
- Verified live via browser: `quietsignal.co.uk/app/` renders the full onboarding UI correctly, no blank page.

**Website bugs (all fixed and verified live):**
- Footer on both template parts (`Footer` and `footer-landing`) had raw, unlocalized placeholder tokens shipped by the Hostinger AI theme builder (`trans-contacts`, `trans-current-year`, etc.) instead of real content, plus a completely broken/deleted navigation menu and a dead email link. Fixed: working nav menu (Home/About/Support/Privacy Policy/Terms), `support@quietsignal.co.uk` as a real `mailto:` link, "Follow us", "© 2026 All rights reserved."
- Newsletter signup form was non-functional (Hostinger Reach, not connected to any account). Compared free alternatives per Richard's request, chose and installed **MailPoet** (free tier, 500 subscribers / 5,000 emails/month, no separate SMTP needed). Configured sender identity, authorized `support@quietsignal.co.uk`, built a "Footer Newsletter Signup" form, wired it into both footer template parts, end-to-end tested with a real signup on the live site — works.
- Deactivated the now-unused Hostinger Reach plugin.

**Supabase backend audit (found and fixed a real security gap):**
- Two nightly `pg_cron` jobs exist: `nightly-journal-scan` (crisis-language check + sentiment/theme insights, 03:00 UTC) and `checkin-archive-scan` (90-day retention → monthly summaries, 03:15 UTC — this was already built, not something done this session, just discovered/confirmed working).
- Both check a `CRON_SECRET` header, but the check was written as `if (cronSecret && ...)` — since `CRON_SECRET` had never actually been set as an Edge Function secret, the check silently no-opped, **meaning both endpoints were publicly callable by anyone with the URL** (no `verify_jwt` either, by design, since they're meant to be cron-only).
- Fixed: retrieved the correct secret value from Supabase Vault and set it as the project's `CRON_SECRET` Edge Function secret (this is a project-wide secret store, one setting covers all functions). Verified via SHA256 digest match that the value now matches exactly what `pg_cron` sends.
- Also set `RECIPIENT_WEB_URL = https://quietsignal.co.uk/share/` so shared check-in links resolve to the real recipient page (already built and live at `/share/`) instead of falling back to raw JSON.
- Crisis-language wordlist in `nightly-journal-scan` (`supabase/functions/nightly-journal-scan/index.ts`) was reviewed — already broadened to ~22 regex patterns covering common crisis phrasings, currently deployed (version 4). **Still explicitly marked ship-blocking in the code's own comments pending a real clinical/safety professional's sign-off** — see "What's left," this can't be closed out by AI review alone.

**App code / git (found uncommitted work already built, got it shipped):**
- Local repo had real, working, uncommitted features: PDF check-in report export (`src/lib/pdfReport.ts`, uses `expo-print`/`expo-sharing` on native, browser print-to-PDF on web), a Backgrounds "teaser gallery" on the check-in screen (`src/components/BackgroundTeaserGallery.tsx` — surfaces the full Pro photo library as a browsable upsell instead of a locked text button), plus fixes to settings tab reset, sign-up screen contrast, and the Pro purchase celebration flow.
- Committed and pushed (`0789e442`), then cleaned up an accidentally-committed 24.7 MB `dist.zip` build artifact that slipped into that commit (`git rm --cached`, added to `.gitignore`, follow-up commit `c71198a4`, pushed).
- Repo is now clean and up to date on GitHub.

## What's been done (design pass session)

Richard asked for a deep dive on why the app and website felt "bland" rather than premium/Calm-tier, and for direct fixes.

- **Audit produced:** `docs/design-audit.md` — reviewed live site/app screenshots, the app's `theme.ts`/component code, and current UX research on Calm/Headspace's design systems. Diagnosis: good bones (warm non-clinical palette, Fraunces+Karla type pairing, generous touch targets) but almost none of what makes premium wellness apps feel premium — color-graded photography, motion/easing, and an icon language. App codebase confirmed via grep to have **zero animation anywhere** except one confetti component.
- **Website fixes shipped live** (WordPress Site Editor + Additional CSS, cache purged and verified after each change):
  - Unified warm terracotta color-grade CSS filter applied across all three homepage stock photos (previously three different, mismatched color temperatures).
  - Footer recolored from flat WordPress-default near-black (`#2C2A29`) to a warm brown (`#3D2B22`) via the theme's global color palette (`color-2`), consistent with the rest of the brand.
  - Gentle load-in motion added (CSS-only, respects `prefers-reduced-motion`) plus a lift/shadow hover state on all buttons — previously the site had zero motion of any kind.
  - Added a "Get notified at launch" CTA button in the hero, linked via HTML anchor to the existing MailPoet newsletter signup in the footer — confirmed working end to end (scroll-to-anchor tested live).
- **Found but not fixed:** the footer's social links (Facebook/Instagram/TikTok/WhatsApp) are placeholder URLs (`trans-social_facebook_url` etc.), not real links — needs Richard's actual account URLs.
- **Not yet done:** small line icons for the three homepage text sections (cheapest remaining visual win, paused before starting). App-side changes (motion, frosted onboarding cards, icon language, fixing the web export's desktop layout) — none started yet, scoped in the audit doc.

## Midnight Signal redesign (6 July 2026 session)

Full rebrand of website + app to the "Midnight Signal" identity (deep indigo #0B1128 world, lavender text, single gold accent #F3C77C, Fraunces display type — Calm-tier look):

- **Website (live):** rebuilt landing page (two-column hero with floating CSS phone mockup of the check-in screen, frosted feature cards, night-graded photo bands, final CTA), midnight styling on all inner pages/header/footer/404/newsletter form, working top nav menu (the old nav block referenced a deleted menu, id 6493 — replaced with new wp_navigation post 104), Fraunces loaded site-wide via footer template part, new midnight favicon (media id 100). Custom CSS lives in Global Styles (post id 63).
- **App:** new palettes in `src/lib/theme.ts` (dark = flagship midnight, light = soft lavender; added `onPrimary`/`onDanger` tokens), dark-by-default in ThemeContext (brand-first; toggle still in Settings), regenerated brand assets (icon/splash/adaptive in midnight palette), all screens default to dusk/night background photos, Settings rows restyled as frosted cards, ShareFlow contrast fixes, recipient share page + PDF export rethemed.
- **History screen (product decision, per Richard):** NO trend chart or up/down trend language on screen — people with PTSD/anxiety shouldn't be confronted with "not getting better" lines on a hard day. The screen shows a neutral count, kind copy, and the daily list only; the chart and trend sentence live exclusively in the PDF report (`src/lib/pdfReport.ts`, `buildChartSvg`), viewed by explicit choice.
- **Deploys:** web export redeployed to `/app/` by uploading only changed fingerprinted files via Hostinger File Browser (avoids the 24 MB zip); `web/index.html` re-uploaded to `/share/`. A stray `dist.zip` was accidentally committed and immediately scrubbed via amend + force-push (now gitignored alongside `app-build.zip`).

## UI polish, background photo border/blur fix, deploy pipeline (7 July 2026 session)

Long bug-fixing/polish pass across the app, then a full push-to-GitHub + deploy-to-live cycle.

- **History screen:** collapsible day-by-day list (defaults collapsed — anxiety-sensitive design, don't show a wall of past entries by default), redesigned summary card (big-number treatment instead of a cramped sentence), fixed a real white-rectangle rendering bug at the bottom (root cause: no `flex:1` child in the layout tree, unlike JournalScreen — Android/web couldn't resolve full-screen height for the background photo), general spacing/padding pass.
- **Journal screen:** collapsible saved-entries list (same collapsed-by-default pattern), the "write what's on your mind" box moved to vertical center and enlarged (it's the main focus of the screen).
- **Theme/navigation fixes:** `ScreenBackground.tsx` and navigator `screenOptions` were missing a `theme.background` fallback color, causing white flashes/borders on non-Android or non-EAS-build surfaces; `ThemeContext.tsx`'s high-contrast mode was missing a `surface` color override, making all cards read as flat black (photos correctly disappear in high-contrast mode — that part's by design; the flat-card issue was the actual bug); `ShareFlowScreen.tsx`'s `goAddRecipient` was missing `initial: false` in its nested `navigation.navigate` params, which made Settings → Recipients a dead end with no back button.
- **Pro tier copy:** both the Upgrade screen's benefits card and the post-purchase "Welcome to the family" modal now mention downloadable PDF reports and that trends/charts live only in the PDF (matches the History screen's own no-trend-line-on-screen product decision from the Midnight Signal session).
- **Background photo white borders (root cause found, real bug in the source assets):** every one of the 63 photos in `assets/backgrounds/*.jpg` has a solid white letterbox band baked into the file itself, top and bottom, averaging ~22% of the image's height (invisible on full-screen ImageBackground crops, but exposed by the squarer thumbnail crops in `BackgroundTeaserGallery.tsx` and `BackgroundsScreen.tsx`). Fixed by rendering the thumbnail Image oversized (150%, absolutely positioned, centered) inside a fixed-size `overflow:hidden` wrapper, so the crop lands past the white band before it's ever visible. **Important implementation note:** the first attempt used a CSS `transform: scale(1.5)`, which fixed the white border but introduced a visible blur (scaling an already-rendered raster is a soft upscale) — the working fix instead sizes the Image element itself to 150%/-25% offset, so the browser's cover-fit sampling stays at full source resolution. If this area gets touched again, don't reach for `transform: scale` for this kind of "zoom past a bad crop" fix.
- **`assets/backgrounds/misty-water.jpg` re-cropped at the source** (not just runtime-compensated) — this one file had an unusually large/asymmetric white band (~34% top, ~22% bottom) vs. the ~22%/22% typical of the other 62 photos. Cropped out the white, kept the real photo content at its natural (near-square) aspect rather than stretching it back to 1080×1920 — cover-mode rendering handles any source aspect fine, and stretching would have distorted the photo. Original backed up before editing.
- **Deployed:**
  - Committed and pushed to GitHub — commit `2a040e0e` (all of the above, in one commit).
  - Built a fresh web export and deployed to `quietsignal.co.uk/app/` via **delta upload** rather than the full ~30 MB zip: confirmed that Metro's content-hashed asset filenames are stable across builds when the file content hasn't changed, so only the new JS bundle, the recropped `misty-water.jpg`, `index.html`, `metadata.json`, and `favicon.ico` actually needed re-uploading. Uploaded via Hostinger's File Browser web UI using its hidden `<input type="file">` elements directly (avoids the native OS file-picker dialog, which isn't interactable). **Watch for the "Replace or skip files?" modal** when uploading a file that already exists at the destination — it silently no-ops the upload if not explicitly confirmed with "Replace all files in destination folder," which is exactly what happened on the first attempt with `index.html`/`metadata.json`. LiteSpeed cache purged (Purge All) after upload; verified live via Chrome network-request inspection that the new JS bundle hash was actually being served, not a stale cached one.
  - A handful of old, now-unreferenced JS bundle files remain in `_expo/static/js/web/` on the server from previous deploys — harmless clutter, not cleaned up.
- **Operational note:** hit a recurring Windows-side `.git/index.lock` issue this session (git refused to run, file appeared genuinely deleted from PowerShell's perspective yet still blocked git from a different vantage point) — resolved itself after repeated deletion attempts and a `git gc --auto` housekeeping prompt (answer `n` to its "retry deletion?" prompts, it's non-destructive). Likely antivirus real-time scanning transiently locking newly-written `.git` internals. If it recurs, suggested Richard add a Windows Defender exclusion for `C:\dev\quiet-signal` — not yet done.

## What's left to do

Everything below genuinely needs Richard's own accounts/access — none of it can be done by an AI agent:

1. **Clinical/safety review of the crisis-language wordlist.** The current list is a good-faith engineering pass, not a substitute for review by an actual mental-health/safety professional. This is explicitly called out as ship-blocking in the code itself (`supabase/functions/nightly-journal-scan/index.ts`).
2. **Real Pro tier payments.** `src/context/ProContext.tsx` currently stubs `purchasePro`/`restorePurchases` (marked `TODO(payments)`) — needs RevenueCat + Play Billing account setup and integration. Requires creating external accounts, which is outside what I can do.
3. **Google Play Console — in progress, paused mid-way:** app entry creation was started (per Richard: "app isn't fully finished yet") but not completed. Still to do: finish creating the app entry, set up a closed testing track, complete the health-app declaration form, complete the Data Safety section, draft ASO store-listing content (title/description/screenshots copy). All need Richard's own Play Console access.
4. **Google Sign-In OAuth consent screen verification** — needs Google Cloud Console access.
5. **`npm audit`** — 13 moderate findings reported earlier; needs to be run locally (the sandbox environment used for this session has an unreliable file mount for npm operations on this repo).
6. **Two low-priority Supabase security advisories** (not urgent, no user data at risk currently): the `pg_net` extension is installed in the `public` schema (should be moved to its own schema), and leaked-password protection is disabled in Supabase Auth settings (recommend enabling — checks new passwords against HaveIBeenPwned).
7. **Medical device classification** — informally assessed as low-risk earlier in the project; a second opinion from a professional/legal reviewer was recommended but never obtained.
8. **Old OneDrive folder cleanup** — minor local-machine housekeeping mentioned early in the project, low priority.

## Quick reference

- Repo: `C:\dev\quiet-signal` / `https://github.com/Valentigo-Ai/quiet-signal.git`
- Supabase project ID: `bzczbsrtbnqiydscvnak` (region eu-west-2)
- Live app: `https://quietsignal.co.uk/app/`
- Live website: `https://quietsignal.co.uk/`
- Live recipient share page: `https://quietsignal.co.uk/share/`
- Edge functions: `generate-message`, `share-checkin`, `get-shared-message`, `nightly-journal-scan`, `delete-account`, `checkin-archive-scan`
