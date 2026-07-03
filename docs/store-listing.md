# Quiet Signal - App Store / Play Store listing copy

Draft copy, ready to paste into App Store Connect / Google Play Console. Character limits noted
where the stores enforce them - trim to fit your final screenshots and branding if needed.

## App name
Quiet Signal

## Subtitle (App Store, 30 char max) / Short description (Play Store, 80 char max)
Say how you're doing, quietly.

(29 characters - fits both limits with room to spare.)

## Promotional text (App Store, 170 char max, editable without a new build)
A 15-second daily check-in for chronic pain and PTSD. Log how you're really doing, and let someone
you trust know - without having to find the words out loud.

## Full description

A quiet way to say how you're doing.

Quiet Signal is a free daily check-in app built for people living with chronic pain, PTSD, or
anxiety - including veterans and military families, though it's built for anyone who finds it hard
to put how they're feeling into words out loud.

Each day, log three quick scales - pain, anxiety, and energy - in about 15 seconds. Add a note if
you want to. That's it. No lengthy assessments, no streaks to keep up, no pressure.

WHAT MAKES IT DIFFERENT

Share a status, not your whole story. After logging a check-in, you can choose to send a short,
plain-language message to someone you trust - a partner, a friend, a family member - so they know
how you're doing without you having to explain it all yourself. Nothing is ever shared
automatically. You decide, every single time.

See your own patterns. A private history view shows your trends over time - useful for spotting
what helps, and handy to bring to a GP or therapist appointment.

A private journal, with a safety net. Write freely in a journal that's just for you. A background
check quietly watches for crisis language in what you write, purely to point you toward support
resources if you ever need them - never to read your journal for any other purpose, and never to
diagnose or treat anything.

Crisis support, always one tap away. Country-aware crisis and emergency contact information is
built into the app and never hidden behind a login or a paywall.

YOUR DATA

Everything you log is private by default. We never sell your data or share it with advertisers.
You can export everything you've stored, or delete your account and all your data permanently, at
any time, from Settings.

QUIET SIGNAL PRO (optional)

The core app - check-ins, journal, history, and crisis support - is free, forever, for everyone.
Pro is an optional upgrade for people who want more: share with more than one person, see extended
90-day trends and export a summary to share with anyone you choosery, and unlock more background photo options.

Quiet Signal is not a diagnostic tool, a crisis service, or a replacement for professional care.
If you're in immediate danger, please contact your local emergency number.

## Keywords (App Store, 100 char max, comma-separated, no spaces)
chronic pain,PTSD,mood tracker,checkin,veteran,mental health,anxiety,symptom tracker,caregiver,journal

## Suggested category
Primary: Health & Fitness (or Medical, depending on store review guidance)

## Support email / URL
Domain is live: **quietsignal.co.uk** (Hostinger Business). The full site (Home/About/Support/
Privacy Policy) is built and published in WordPress. Still need to set up `support@quietsignal.co.uk`
in Hostinger's hPanel > Emails before submitting - both stores reject placeholder addresses.

## Privacy policy URL
Live now, as a WordPress page (not the static `web/privacy-policy.html` file - that file is
superseded/unused, kept in the repo for reference only):

**https://quietsignal.co.uk/privacy-policy/**

## Recipient share page URL
`web/index.html` (the no-login page a recipient lands on when they get a shared check-in) is
uploaded and live at:

**https://quietsignal.co.uk/share/**

Last remaining step: set `RECIPIENT_WEB_URL=https://quietsignal.co.uk/share/` as a secret on the
`share-checkin` edge function (Supabase Dashboard > Edge Functions > `share-checkin` > Secrets - MCP
tooling can deploy function code but not secrets, so this needs to be done manually once). The
function already falls back to the raw Supabase URL if this isn't set, so nothing is broken in the
meantime.

No code changes needed for Google/email auth - those use the app's own `quietsignal://` scheme, not
the website domain, so they're unaffected by this.

## Play Console "Data safety" form - what to declare
Based on what the app actually collects (see `src/constants/legalCopy.ts` and the Supabase schema):

- **Health & fitness data**: yes - pain, anxiety/PTSD, and energy scores, and journal entries.
- **Personal info**: email address (for the account).
- **App activity**: check-in history, in-app actions (for the app's own history/trends feature -
  not for tracking or advertising).
- **Data shared with third parties**: no advertising or analytics SDKs are used in this build.
- **Data deletion**: yes, user-initiated, in-app (Settings > Delete account), immediate and
  permanent.
- **Data encrypted in transit**: yes (Supabase/HTTPS).

This list reflects the current codebase, not legal advice - worth a quick read-through against the
actual form before submitting, since the exact Play Console categories change from time to time.
