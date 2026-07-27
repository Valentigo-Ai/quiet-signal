# Quiet Signal — Handover (Jul 27, session 4)

Continues from the Jul 26 session-3 handover. This session: shipped v37 and v38,
confirmed a cross-user data-exposure fix was live and established its actual blast
radius, fixed a stale-data bug that silently produced incomplete PDF reports, fixed
the mid-word label wrapping on the check-in scales, and corrected two steps of the
pre-build checklist that don't work the way session 3 believed they did.

## What the app is (unchanged)

See the Jul 25–27 handovers. Non-negotiables unchanged.

## Standing facts / preferences (carry forward, don't re-ask)

Everything from session 3 still holds. New this session:

* **Builds must run in WSL, not PowerShell.** The Android SDK/NDK live in WSL.
  Richard has both open and it's easy to paste into the wrong one — PowerShell
  will run `npm run typecheck` fine and then fail on everything else.
* **Never paste a multi-line block into a shell when the first command can
  prompt.** `git push` prompted for credentials and swallowed the following
  lines as username and password. One command at a time when anything is
  interactive.
* **PowerShell needs different commands.** No heredocs (`git commit -F -` with
  `<<'EOF'` fails); use repeated `-m` flags, one per paragraph. `rm -f` is
  ambiguous; use `Remove-Item -Force`.
* **git writes but cannot delete inside the mounted folder.** Committing from
  the Cowork side half-works: the commit lands, but `.git/HEAD.lock`,
  `.git/index.lock` and `.git/objects/*/tmp_obj_*` are left behind and block the
  *next* git command. Commits should be run by Richard in WSL/PowerShell. If one
  gets stuck: `Remove-Item -Force .git\HEAD.lock,.git\index.lock` then
  `Get-ChildItem .git\objects -Recurse -Filter "tmp_obj_*" | Remove-Item -Force`.
* **`origin` is HTTPS with no credential helper**, so every push prompts and
  GitHub no longer accepts a password — a PAT, `gh auth login`, or an SSH remote
  is needed. Not yet set up; **the two commits below are committed but unpushed.**
* **Claude Code commits to `main` in parallel during a session.** Assume the tree
  can move under you between checking it and building.

## The security fix: `checkins_select_own` operator precedence

Fixed by Claude Code before this session started (commit `6125426e`, migration
applied 07:52). Recorded here because the blast-radius work was done this session
and wasn't written down anywhere.

The deployed policy was

```
(owner AND flagged_crisis) OR is_pro(uid) OR (date >= now() - 30 days)
```

instead of the committed

```
owner AND (flagged_crisis OR is_pro(uid) OR date >= now() - 30 days)
```

`AND` binds tighter than `OR`, so ownership only guarded the crisis clause. The
third disjunct had no ownership test at all: **any authenticated user could read
any user's check-ins from the last 30 days**, and any pro user could read all of
them outright. No migration in the repo produced that version — it was applied
out-of-band, so there's no record of when it landed and the window start is
unknown.

### Blast radius — checked this session

* `checkins` holds **12 rows, all belonging to one account** (`a16c0121…`,
  Richard's test account). 16 auth users, 15 profiles, but only one has ever
  logged a check-in. `journal_entries` likewise: 12 rows, one user. So the only
  data exposable was that one account's, and only to someone else who signed in.
* Every app request in the 24h of retained API logs carries the same
  `user_id=eq.a16c0121…` and the same client (`okhttp/4.12.0`). No second account
  touched `/rest/v1/checkins`. The only other reader is the nightly crisis scan
  running as the service role, which is expected.
* Log retention is 24h on this plan, so **nothing can be said about earlier**.
* Every other RLS policy in `public` was checked for the same mistake. All are
  correctly owner-scoped; `checkins_select_own` was the only one.

Conclusion: no evidence anyone's data was read, and the exposed population was one
account. Disclosed plainly in the v37 release notes (Richard's call).

### Still outstanding from this

`HistoryScreen` and `useCrisisCheck` query `checkins` with **no explicit
`.eq("user_id", …)`** — they rely entirely on RLS to scope rows. `DataExportScreen`
does filter. That's why this bug wasn't merely theoretical: had anyone else been
logging check-ins, the History screen would have rendered their entries inline as
if they were yours. Adding the explicit filter to both read sites as defence in
depth was suggested and **not yet done**.

## Releases: 35 → 37 → 38

Version codes come from EAS remote (`appVersionSource: remote`, `autoIncrement`),
and **a failed build still consumes one**. 36 was burned by the build that died on
disk space, so the first successful build of the day was 37, not 36.

* **v37** — released 10:53. Contains `0c72f154` (Save button behind tab bar),
  `5947aaee` (Log out / History loading feedback, auth-bootstrap breadcrumb) and
  `f4b53058` (reworded PTSD scale labels, mid-word pill wrapping workaround).
  Release notes added after publishing.
* **v38** — released ~12:00. Contains `df5fab73` and `6de919aa` (below). Release
  notes filled in before publishing.

Both notes were written for testers in plain language and include the data-access
fix stated plainly rather than vaguely.

## Fixes shipped in v38

**`6de919aa` — History reloads on focus.** `HistoryScreen` loaded rows on mount
only. The tab navigator keeps the screen mounted, so once History had been opened
it never refetched: a check-in logged afterwards stayed missing from the screen —
and from the PDF export, which reads the same state — for the rest of the session.

Surfaced as a PDF downloaded seconds after a check-in with a PTSD score showing no
PTSD column. `pdfReport.ts` gates the PTSD column and trend line on
`rows.some(r => r.ptsd_score !== null)`, so with stale rows it correctly omitted
it. The check-in itself had saved fine (verified in the database: 2026-07-27,
ptsd_score 4). Now uses `useFocusEffect`, matching `CheckInScreen`.

**`df5fab73` — check-in scale labels no longer break mid-word.** `ScaleInput` had
a `DISPLAY_LINE_BREAKS` map hardcoding `"Ground\ned"` / `"Trigger\ned"`, which left
an orphaned "ed" on its own line. It existed because the original shrink-to-fit
used `adjustsFontSizeToFit` and `minimumFontScale` — **both iOS-only, silent
no-ops on Android**, so the font never shrank and the manual split was added to
compensate. Replaced with a length-based font size (10px for 10+ chars, 11px for
8+, 12px otherwise; multi-word labels untouched, they wrap at spaces). Label
strings themselves are unchanged, since they're reused in the share summary, PDF
export and history rows.

Thresholds were estimated from a screenshot, not measured on device. If "Triggered"
still wraps, change `>= 8` to `>= 7`.

## Build environment: the tmpfs trap

The first build failed after 18 minutes with `No space left on device` during the
expo-modules-core C++ compile. **Not a full disk** — `/` had 938G free. `/tmp` is a
**tmpfs, RAM-backed, capped at 4.9G**, and EAS local copies the whole project there
per run and wants ~10G+. Deleting things wouldn't have helped; `/tmp` was already
empty.

Fix, and how every local build should now be run:

```bash
mkdir -p /home/zargon/eas-build
EAS_LOCAL_BUILD_WORKINGDIR=/home/zargon/eas-build eas build --platform android --profile production --local
```

Artifacts still land in the current directory, so run it from
`/mnt/c/dev/quiet-signal`. Worth exporting in `~/.bashrc`. v35 built fine from the
same setup the previous day, so either `/tmp` changed across a WSL restart or that
build squeaked under the ceiling.

## Pre-build checklist (revised — two steps of the old one were wrong)

1. `list_migrations` on Supabase vs `supabase/migrations/`. **Compare by
   migration *name*, not filename timestamp** — migrations applied via MCP get a
   different version number than the repo filename (e.g. repo `20260727075152`
   applied as `20260727075229`), so a timestamp diff shows false positives.
2. `npm run typecheck` **in WSL**. (Over the Cowork mount it takes 5+ minutes and
   may never finish; in WSL it's seconds.)
3. `rm -f build-*.aab` — must be run by Richard; deletes are blocked from the
   Cowork side.
4. Build with `EAS_LOCAL_BUILD_WORKINGDIR` set. **Record the commit hash EAS
   prints at the start of the build** — `git log -1` beforehand is *not* a
   reliable record of what went in, because Claude Code may commit mid-build.
   (This happened: the payload from the failed 09:40 build said `0c72f154`, but
   the successful ~10:28 build picked up two later commits.)
5. **Verify the bundle by hash, not by grep.** `index.android.bundle` is Hermes
   bytecode (magic `c61fbc03`), not JavaScript — only the *string table* is
   greppable. Grepping for code (a function name, a hook call, a style property)
   always fails whether or not the change is present. Extract the bundle, `md5sum`
   it, and compare against the previous build's hash; an identical hash means a
   stale build. Keep the hash in the handover so the next build has a baseline.
   Where a change adds or removes a *string literal*, grep is a useful extra check.
6. Only then upload. Once uploaded, don't navigate away or reload that tab until
   saved.

### Bundle hashes

```
v35  982ee4618915d770b369f7c0d32f48f8
v37  b7deadaa4399c7d95bc671041754344b
v38  8da047f445451aaecced98454f33ce81
```

v38 additionally verified by string: `Ground\ned` / `Trigger\ned` / `Over\nwhelmed`
each appear once in v37's bundle and zero times in v38's, confirming the label fix
is really in the build.

## What's left to do

1. **QA v38 on device** — PTSD row reads `Grounded` / `Triggered` on single lines;
   a fresh check-in with a PTSD score appears in a PDF downloaded straight after.
2. **Push the two commits.** `main` is 2 ahead of `origin/main`; push auth not set
   up yet (see standing facts).
3. **Confirm `reportDataError` actually reaches Sentry.** Still the one unverified
   link in the chain, carried over from session 3.
4. **Add explicit `.eq("user_id", …)`** to `HistoryScreen` and `useCrisisCheck` as
   defence in depth behind RLS.
5. `getSession` slow path — Sentry `REACT-NATIVE-1` / `REACT-NATIVE-2`. Unchanged
   from session 3; suggested next step is still a duration-only breadcrumb around
   the AsyncStorage persisted-session read.
6. Decide whether to submit the pending Play Console changes. Unchanged.
7. Minor: 16 auth users but 15 profiles — one account has no profile row. Not
   investigated.
8. The session-3 item "check-in produced no POST at all" did **not** recur; today's
   check-in saved cleanly at 10:12:40 UTC. Leave open but downgraded.
