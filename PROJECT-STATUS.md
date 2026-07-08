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

## Backgrounds placement, photo grading, lake video, crisis-wordlist review, website fixes (8 July 2026 session)

**Design feedback → full color-grade + Backgrounds picker relocation:**
- Richard flagged two things: he loved the blue-overlay grade on the website's marketing photos, and worried the in-app Backgrounds photo picker on the daily check-in screen was too visually busy for an anxiety-safe app — confirmed it was originally "a sales gimmick to sell Pro, like Calm does."
- Graded all 63 photos in `assets/backgrounds/*.jpg` to match the website's cool-blue palette (recipe: channel mix toward blue `r*0.82/g*0.92/b*1.12`, desaturate to 0.38, blend with indigo `#0A0E22` at 0.40 opacity, brightness ×0.80, contrast ×1.18; originals backed up as `*.orig.jpg`, gitignored).
- Deleted `BackgroundTeaserGallery.tsx` entirely and removed it from `CheckInScreen.tsx` (with an explanatory code comment on why — decision-fatigue on the one screen built around a 15-second task). Added a small honest photo preview (6 thumbnails + lock icons) to `UpgradeScreen.tsx` instead — the one screen where "look how nice these are" is actually the point.
- `BackgroundsScreen.tsx` (Settings): added a "Free images" section (shows the screen's default + the 3 free photos together, gold "Free" badges, no lock) so free users can see upfront what's available to them, plus a small "Free" badge on those same photos within the full category grids. Per-screen helper `freeIdsForScreen()` added to `backgroundLibrary.ts` usage.
- Deployed twice this session (photo+code batch, then the Free-images follow-up) via the same Hostinger File Browser delta-upload + LiteSpeed purge pattern as prior sessions; both verified live.

**Looping video background on the check-in screen:**
- Richard supplied `lake.mp4` (his own footage, willow tree + reflection) wanting it as a graded, looping, silent background specifically behind the daily check-in.
- Cropped to portrait, applied the same cool-blue grade recipe as the photos, built a seamless loop via crossfade (last 1.5s fades into the first 1.5s, avoiding a hard restart "pop"). Final asset: `assets/video/checkin-lake-loop.mp4`, 720×1280, 14.2s, ~1.5 MB, silent (source audio confirmed near-silent, Richard confirmed no sound needed).
- Added `expo-video` as a new dependency; built `src/components/ScreenVideoBackground.tsx` (muted/looping `VideoView`, high-contrast fallback matching `ScreenBackground.tsx`'s pattern); wired into `CheckInScreen.tsx` in place of the static photo background. Deliberately **not** added to the Backgrounds picker system — it's a fixed, non-selectable ambient background, consistent with keeping this one screen free of choices.
- **Two real bugs found and fixed during verification** (both would have shipped broken):
  1. On web, a `<video>` element is a CSS "replaced element" — `position:absolute` + `inset:0` does **not** stretch it to fill its parent the way it does a `<div>`; without explicit `width:100%/height:100%` it silently rendered at the browser's default 300×150 box. Fixed in `ScreenVideoBackground.tsx`.
  2. The exported video's `moov` atom (metadata) was at the **end** of the file — fine for local playback, but unreliable for progressive HTTP streaming in browsers (the file was confirmed byte-range-servable, yet the video would never actually start decoding). Fixed by re-muxing with `-movflags +faststart` (ffmpeg, stream copy, no quality/size cost).
- Deployed (three iterations, working through the two bugs above), verified live via a real-viewport (390px) iframe test technique (window resize didn't work in this session's browser tooling, so a same-origin iframe at true mobile width was used instead — reusable trick if it comes up again).
- **Discussed and declined for now:** using the same video as the website's marketing hero background — recommended against it on performance/Core Web Vitals grounds (a photo hero loads faster and reads as "calm" just as well); can revisit if Richard still wants it.

**Website: mobile header bug + messaging consistency (both fixed and verified live):**
- Richard reported "About" and "Support" page titles not fully visible on mobile, and questioned whether the home page's veterans-first framing matched the About page. Both confirmed real:
  - Root cause of the title clipping: the "Quiet Signal" wordmark in the fixed/sticky mobile header wraps to two lines (its grid column is a fixed ~22% of the header row, only ~75px wide), making the header taller than the space the page reserves below it — so page titles rendered partly hidden underneath. Fixed via Additional CSS (WordPress Customizer → Additional CSS, published): `.hostinger-ai-menu .wp-block-site-title` font-size reduced to 12px at `max-width: 782px` so the wordmark always fits on one line. Verified on both About and Support at real 390px width via a same-origin iframe test.
  - Messaging: home page hero tagline said "Designed with veterans and military families in mind — open to everyone," reading as if veterans were the primary audience; About's actual "Who it's for" section leads with severe anxiety/PTSD/chronic pain generally, naming veterans/military families as an included group. Home page tagline updated to match: "Designed with severe anxiety, PTSD, and chronic pain in mind — including veterans and military families. Open to everyone." Edited via the block editor (Pages → front page), saved, verified live, cache purged.

**Crisis-language safety net — engineering review + outreach to Samaritans (in progress):**
- Richard produced (with prior AI help) `docs/crisis-wordlist-review.md`, a structured engineering review of the crisis-language mechanism (`nightly-journal-scan` + `useCrisisCheck`), and sent it plus a request for advice to Samaritans' free Online Harms Advisory Service, referencing his own history (medically discharged from Royal Marines training with PTSD/chronic pain/anxiety, and that a Samaritans call once helped him).
- **Samaritans replied same day** (Seema Inamdar, Online Safety Manager) — warm, personal response, offering a video call to discuss the app rather than a written review. Awaiting Richard's reply with availability.
- Built `samaritans-call-prep.md` (in the outputs folder, not the repo) — a plain-language talking-points sheet for that call, built from the five open reviewer questions in the engineering doc, reframed as things to actually say out loud rather than technical bullet points. Richard has since edited/trimmed it himself (removed the check-in-notes question once we confirmed it's already implemented — see below).
- **Important: verified the code already covers the review doc's Finding 1** (the doc said check-in notes were "NOT yet fixed" / a live gap) — `nightly-journal-scan/index.ts` in fact already has a "STEP 1b" block scanning `checkins.note` with the identical wordlist and normalization as journal entries, and `useCrisisCheck.ts` already reads `flagged_crisis` from both the `journal_entries` and `checkins` tables. So: **both surfaces are covered**, not just the journal — the review document was already stale on this point by the time it was sent.
- Confirmed via code read: the wordlist (`CRISIS_PATTERNS` in `nightly-journal-scan/index.ts`) currently has **35 entries** (12 direct ideation, 8 passive ideation, 6 self-harm, 9 hopelessness/burden/farewell) — several entries also cover multiple wordings via regex alternation (e.g. "suicide"/"suicidal" in one entry), so real coverage is somewhat broader than the raw count.
- Confirmed the Samaritans phone number as configured in the app's own Crisis Resources list (`src/constants/crisisResources.ts`): **116 123**, free/24-7, used identically for both the UK and Ireland entries.
- Clarified for Richard: none of this is a formal Google Play requirement (checked current Play Console policy — no rule mandates third-party crisis-content review; Quiet Signal's private journal likely doesn't even trigger Play's public-UGC moderation rules since entries aren't visible to other users). It matters anyway because it's the responsible thing to do for a vulnerable audience, not because a store policy demands it — this distinction was a point of genuine back-and-forth with Richard and is worth being consistent about going forward.
- **Not yet done:** Richard hasn't replied to Samaritans with availability yet; the call itself hasn't happened. The professional review remains explicitly ship-blocking per the code's own comments until that call happens and any resulting changes are made.

**Git:** two commits pushed by Richard this session — `64477380` (Free images section in BackgroundsScreen) and `19e12823` (lake video background: new `expo-video` dependency, new `ScreenVideoBackground.tsx`, `CheckInScreen.tsx` updated, video asset added).

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
