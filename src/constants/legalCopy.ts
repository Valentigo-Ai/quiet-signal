// Section 11 - concrete legal/compliance copy used across onboarding & Settings.
// Not legal advice; a data-protection review is still recommended before
// public launch, per Section 11.

export const CONSENT_VERSION = "2026-07-06-v2";

export const HEALTH_DATA_CONSENT_COPY = `Quiet Signal asks you to log some personal health information so it can work:

- Pain level
- Anxiety / PTSD state
- Energy level
- Anything you write in your optional journal

Under UK data protection law, this counts as "special category" health data, so we're asking you to
actively confirm you're comfortable with it before you use the app.

This data is used only to:
- Show your own history and trends back to you
- Generate the plain-language status messages you choose to share
- Run an automated nightly check for crisis language in journal entries and check-in notes, purely to
  point you to support resources - never to diagnose or treat anything

It is never sold, and only ever shared with the specific people you choose, for the specific check-ins
you choose to share. You can withdraw this consent and permanently delete everything at any time from
Settings > Delete account.`;

export const AGE_GATE_COPY =
  "Quiet Signal is for adults 18 and over. By continuing, you confirm you're 18 or older.";

import { CountryCrisisInfo, getGeneralResources } from "@/constants/crisisResources";

// Country-aware version - names the general-audience resource(s) for the
// person's region, since this disclaimer is shown to everyone regardless of
// whether they're military-connected. Veteran-specific lines are named
// separately in their own section on the Support tab, not here. See
// src/constants/crisisResources.ts for the full set.
export function getCrisisSafetyDisclaimer(info: CountryCrisisInfo): string {
  const topResources = getGeneralResources(info)
    .slice(0, 2)
    .map((r) => (r.phone ? `${r.name} (${r.phone})` : r.name))
    .join(", ");
  return (
    `Quiet Signal is not a crisis or emergency service. If you're in immediate danger, call ${info.emergencyNumber}. ` +
    `For urgent support, contact ${topResources}.`
  );
}

export const PRIVACY_NOTICE_MARKDOWN = `# Quiet Signal Privacy Notice

**Last updated:** 1 July 2026

## What we collect
Your account email, your daily check-in scores (pain, anxiety/PTSD state, energy), any optional notes
or journal entries you write, and the list of people you choose to share with.

## Why we collect it
Purely so the app can work: show your own history, generate the messages you choose to share, and run
an automated nightly safety check on journal entries and check-in notes so we can point you to crisis
support if it's ever needed.

## How long we keep it
For as long as your account exists. If you delete your account, everything is deleted immediately and
irreversibly - not just deactivated.

## Who can see it
Only you - except for a specific check-in status message you actively choose to share, which is visible
only to the specific person you send it to. We never see, sell, or share your data with advertisers or
other third parties.

## Your rights
You can export all of your data or delete your account at any time from Settings. Deleting your account
permanently removes your check-ins, journal entries, recipients, and shared message history.

## Contact
If you have questions about your data, contact the app's data controller via the support email listed
on the Play Store listing.`;
