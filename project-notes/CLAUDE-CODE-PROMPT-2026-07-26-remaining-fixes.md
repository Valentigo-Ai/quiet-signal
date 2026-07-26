# Claude Code prompt — remaining fixes (26 Jul 2026)

Paste everything below the line into Claude Code.

---

You are working in the Quiet Signal repo (`C:\dev\quiet-signal`, branch `main`, currently at
`1ed5565d`). It is a React Native / Expo mental-health support app for people with chronic pain,
PTSD and anxiety, including veterans and military families. It is deliberately a non-clinical
wellness and reflection tool — never describe it as medical, diagnostic or clinical.

Standing constraints that apply to everything below:

- Crash reporting is **errors only, no PII**. Never log or attach note text, journal text, email
  addresses, or any check-in scores. User IDs are already attached by the existing Sentry setup and
  are fine; nothing else about the person is.
- No references to any AI vendor anywhere in code comments, copy, or commit messages.
- Copy that a user might read must stay plain-language, warm and non-clinical, and must avoid
  negation priming (do not write reassurance in the form "you're not in trouble" / "nothing bad has
  happened").
- Follow the existing house style in this repo: comments explain *why* a thing is the way it is,
  especially where the code looks surprising. Match that. Do not add restating-the-obvious comments.
- Do not run `git push`. Stop after committing locally and report what you changed.

There are three tasks. Task 1 is the important one.

---

## Task 1 — Supabase failures are invisible to Sentry

**The problem.** Earlier today the app shipped a build whose check-in screen wrote a `ptsd_score`
column that did not yet exist in the database. Every check-in save failed and the History screen
returned HTTP 400 on every load. Sentry recorded **zero** events for any of it, because every
Supabase call in this codebase handles failure by calling `Alert.alert` or by ignoring the returned
`error` object entirely. Nothing throws, so nothing is reported. The entire data layer is a blind
spot, and the one tool that should have caught a schema mismatch within minutes could not see it.

**What to do.**

Add a single reporting helper — put it next to the existing Sentry helpers so it sits with
`reportAuthHang` rather than being a new parallel system. Something along the lines of
`reportDataError(error, area, context?)`, where `area` is a short stable string identifying the call
site (`"checkin-save"`, `"history-load"`, `"journal-save"`, etc.), matching how `reportAuthHang`
already uses its `area` tag.

It must capture the parts of a PostgREST error that make it diagnosable — `code`, `message`,
`details`, `hint` — because those are what identify a schema mismatch (`PGRST204`), an RLS refusal
(`42501`) or a constraint violation. It must **not** capture the row payload, since that is the
user's health data.

Then find every Supabase call in `src/` and route its error path through the helper. Grep for
`supabase.from(`, `supabase.auth.`, `supabase.rpc(` and `supabase.functions.` to build the list —
expect check-in save, History load, journal load/save, recipients, share flow, data export, delete
account, Pro/entitlements, and the crisis check. Two distinct cases to handle:

1. **Errors already surfaced to the user** (there is an `Alert.alert` on the failure path) — keep
   the alert exactly as it is, add the report alongside it.
2. **Errors currently swallowed** (the destructured `error` is never checked, or a `catch` is
   empty) — report them. Where the failure means the screen is now showing something false or empty,
   surface it to the user too, in the app's existing voice. The History screen is the specific case
   that matters: it silently rendered an empty list while the query was 400ing, so a user with
   months of history saw nothing and had no idea anything was wrong. Do not let a load failure
   masquerade as "you have no entries".

The crisis path is the exception to "keep it quiet": `useCrisisCheck` and anything feeding the
Crisis Resources screen must report failures loudly to Sentry, because a silent failure there means
the nightly wordlist scan's safety net did not fire. Do not add user-facing alerts on that path —
report it, don't alarm the person.

**Verification.** After wiring it up, temporarily point one query at a non-existent column, confirm
a Sentry event arrives with the `PGRST204` code and no user data in it, then revert. Say clearly in
your report whether you did this.

---

## Task 2 — Legacy `presenting_concerns` values were never migrated

**The problem.** Before the July 2026 split, `WhatAreYouDealingWithScreen` offered three options with
these stored keys:

- `chronic_pain` — "Chronic pain"
- `ptsd_anxiety` — "PTSD / anxiety"
- `both` — "Both"

The split (commit `0bc60196`) replaced them with `chronic_pain`, `anxiety` and `ptsd`, but nothing
rewrote the values already sitting in `profiles.presenting_concerns`. In production, 11 of 14
profiles still hold `["both"]`. `CheckInScreen` checks for `"anxiety"` and `"ptsd"` literally, so
those users match neither and are now asked **neither** question — the split silently removed both
dimensions from every pre-split user, with no error and nothing on screen to indicate it.

**What to do.**

Write a new migration in `supabase/migrations/` that rewrites the legacy keys. `both` meant "chronic
pain **and** PTSD/anxiety", and the old combined scale's data lives in what is now `anxiety_score`,
so map:

- `both` → `chronic_pain` + `anxiety`
- `ptsd_anxiety` → `anxiety`

Deliberately **not** adding `ptsd` to these users: it would start asking them a brand-new daily
question, in unfamiliar wording (Grounded / A little on alert / Keyed up / Triggered / Flooded), that
they never opted into. For a PTSD population that is not a small thing to spring on someone. They can
now add it themselves in Settings → "What you're tracking", which is exactly what that screen is for.
Explain this reasoning in the migration comment.

The migration must be idempotent and must not disturb rows already on the new keys. Preserve
`chronic_pain` where present and avoid creating duplicate array entries.

Also make the app defensive, so a stale key can never again silently mean "ask nothing". In
`src/constants/presentingConcerns.ts` add a normaliser that maps legacy keys to current ones, and use
it wherever `presenting_concerns` is read — `CheckInScreen`, `WhatYoureTrackingScreen`, and anywhere
else the grep finds. The database migration fixes today's rows; the normaliser means a row that
somehow escapes it still behaves correctly.

**Verification.** Confirm every distinct key in `profiles.presenting_concerns` is one of the three
current keys after the migration, and that `WhatYoureTrackingScreen` shows the right boxes ticked for
a previously-`both` profile.

---

## Task 3 — Investigate the `getSession` slow path

Lower priority, and explicitly an investigation rather than a prescribed fix. Do not restructure the
auth bootstrap without saying what you found first.

Sentry has two open issues, `REACT-NATIVE-1` (`getSession still running after 6000ms`, 5 events) and
`REACT-NATIVE-2` (`getSession never settled after 45000ms`, 3 events), both from
`src/context/AuthContext.tsx`, affecting 2 users, most recently on build 33. Note these are
**telemetry only** — both timers arm only when a persisted session exists, meaning the optimistic
path has already let the user into the app. Nobody is stuck on the splash. That is working as
designed and should stay that way.

What is worth understanding is why the call genuinely never settles inside 45 seconds. Events cluster
on a low-end device (Samsung SM-A055F, Android 15, `device.class: low`, 3.8 GB RAM). Worth checking
whether it correlates with a cold start, an expired token needing refresh, or slow storage reads of
the persisted session. Report what you find and propose an approach before changing behaviour.

---

## Also worth knowing

A check-in logged manually at ~15:27 UTC today produced **no** `POST /rest/v1/checkins` in the
Supabase API log at all — no failed request, no request. It is not yet known whether the app blocked
on its own client-side validation, or errored before the network call. Task 1 is what will make this
diagnosable, so do not treat it as a separate bug to chase; just be aware it is unexplained, and if
anything you touch in the check-in save path explains it, say so.

Nothing here requires a new app release to be cut. Stop after committing locally.
