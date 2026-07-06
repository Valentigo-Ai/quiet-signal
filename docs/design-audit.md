# Quiet Signal — Design Audit: Getting to "Calm-tier"

Reviewed live: quietsignal.co.uk (website), quietsignal.co.uk/app/ (pre-login flow), theme.ts and component code in the repo. Compared against calm.com and current UX research on Headspace/Calm's design systems.

## The core diagnosis

The bones are genuinely good — warm non-clinical palette, a proper brand serif (Fraunces) paired with a clean sans (Karla), generous touch targets, subtle card shadows. It reads as *safe and calm*. It doesn't yet read as *premium*, because premium wellness brands add three things this build has almost none of: **color-graded imagery** (not raw stock photos), **motion** (eases, transitions, feedback), and **a visual icon language** (not just text). Right now every screen is: photo + white card + text + solid button. That sameness is what's making it feel bland rather than considered.

## Website (quietsignal.co.uk)

1. **Inconsistent stock photography.** Hero is a mountain sunset, next section a lake dock, next a waterfall garden — three different color temperatures, none graded to the brand's terracotta. Calm/Headspace never show raw stock; everything's tinted to their palette so it feels shot *for* the brand. Fix: apply a consistent warm-terracotta duotone/gradient overlay across all section photos.
2. **No product visualization.** The whole homepage is text-on-photo with zero screenshots of the actual app. Visitors can't see what they're signing up for. Every premium app landing page leads with a phone mockup. Fix: add a phone-frame mockup of the check-in screen near the hero.
3. **Walls of paragraph text, no icons.** "What it does," "Share a status," "Your data stays yours" are all plain centered paragraphs. Fix: give each section a small line-icon (in the brand terracotta) — this is a five-minute visual win that breaks up the monotony.
4. **Footer doesn't match the brand.** Warm cream/terracotta site suddenly hits a flat near-black WordPress-default footer. Fix: recolor to a deep warm brown consistent with the rest of the palette.
5. **No motion at all.** Sections just appear. Fix: simple fade/slide-in on scroll (a few lines of CSS/JS) — cheap, and it's exactly the kind of "slow, easing" motion the research calls out as core to why Calm feels calming rather than static.
6. **Hero has no CTA button**, just italic "Coming soon" text. Even pre-launch, a disabled-style "Notify me" button (wired to the newsletter signup you already have via MailPoet) reads more finished than a caption.

## App (pre-login flow + code)

1. **Zero animation anywhere in the codebase** — confirmed by grep; only `ConfettiBurst` uses any animation API. Headspace's whole "feel" is slow easing curves on every transition. Fix: add subtle fade/scale transitions between onboarding screens, a spring-press on `PrimaryButton`, and an eased fill animation on `ScaleInput` selection.
2. **Onboarding card is a flat white rectangle with a hard drop shadow** sitting on top of a busy photo. Fix: switch to a frosted/blurred glass card (`backdrop-filter` on web, `expo-blur` on native) — this is the single highest-impact "2025 calm-UX" trend in the research and would look immediately more premium than solid white.
3. **No icon language.** Pain/Anxiety/Energy are plain text labels with no visual marker. A small custom icon set (in the terracotta accent, rounded/soft like Headspace's characters) would make the check-in screen feel designed rather than default.
4. **Web export breaks on desktop.** At desktop widths the app stretches full-bleed edge to edge instead of staying in a centered mobile-frame column — this is what quietsignal.co.uk/app/ looks like today, and it reads as unfinished to anyone who opens it on a laptop.
5. **Photo inconsistency mirrors the website issue** — onboarding uses a mountain/rock-cairn photo, check-in uses whatever's in `getSource`, none color-graded to match. Same duotone fix as the website.

## Suggested order of attack

Given how much surface area this is, the highest-leverage fixes for the least effort are: (1) a consistent brand color-grade over all photography on both surfaces, (2) motion/easing added to transitions and button presses, (3) icons replacing bare text in a few key spots. Those three alone are most of what separates "bland" from "Calm-tier" per the research — before touching layout or copy.
