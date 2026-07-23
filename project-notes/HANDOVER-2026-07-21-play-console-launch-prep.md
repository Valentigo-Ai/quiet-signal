Quiet Signal — Handover (2026-07-21, Play Console launch checklist: content rating, data safety, store listing, icon/README correction)

Continuation of extended pre-launch work. This session's task: work through the Play Console "Finish setting up your app" checklist so the closed test can go live. Content rating, Data safety (draft), Government apps, Financial features, Advertising ID, App category+contact, and Store listing text+icon+feature graphic (draft) are all done. Two remaining blockers need Richard directly (not more agent work) — see "WHAT'S LEFT TO DO."

KEY IDENTIFIERS (carry forward)
* Repo: `C:\dev\quiet-signal` / GitHub `Valentigo-Ai/quiet-signal` (branch `main`)
* Supabase project: `quiet-signal`, id `bzczbsrtbnqiydscvnak` (eu-west-2/London)
* App package `com.quietsignal.app`; Play Console app id `4973719539259427979`; developer account "Cloud Seaker" id `7440677865943147994`, signed in as `zargona2z@gmail.com`, Play Console login index `u/2`
* Support email `support@quietsignal.co.uk`; website `https://quietsignal.co.uk`; privacy policy `https://quietsignal.co.uk/privacy-policy/`
* Store listing copy source of truth: `docs/store-listing.md` (used verbatim for all text fields)
* RevenueCat project id `4d31fc1f` (from a prior session, unrelated to this session's work)

WHAT WAS DONE THIS SESSION (in order)

1. Content rating (IARC questionnaire) — completed all sections and submitted through to Summary, all green-checked.

2. Data safety form — fully declared: Email address (personal info, collected/not shared, required, App functionality + Account management), Health info (collected/not shared, required, App functionality), Other user-generated content i.e. check-in/journal content (collected/not shared, user can choose, App functionality). Declined the independent security review badge. Verified via the Preview step that it correctly shows "Data collected" and "No data shared with third parties." Saved as draft only — full submission is blocked because it requires Target audience to be completed first, which is itself blocked by Sign in details (see blockers below).
   Mid-task bug (self-caused, fixed): a click meant for a separate control landed instead on the page's top-level "Does your app collect or share any of the required user data types?" radio, silently flipping it back to No and wiping the sub-answers. Caught via the Preview step showing "No data collection declared." Fixed by redoing the Data collection and security step, screenshotting after every single click going forward rather than batching clicks.

3. Government apps — answered No, saved and published.

4. Financial features — "My app doesn't provide any financial features," saved and published.

5. Advertising ID declaration (found via App content overview, not on the main dashboard checklist, but blocks Android-13+ targeting if skipped) — answered No (no ads, no ad SDKs), saved and published.

6. App category + Store listing contact details — Category set to Health & Fitness; contact email `support@quietsignal.co.uk`, website `https://quietsignal.co.uk`. Published.

7. Store listing text — short description "Say how you're doing, quietly." (30 chars) and full description (~2197 chars), both pasted verbatim from `docs/store-listing.md`. Saved as draft.

8. Store listing graphics — generated a 512×512 app icon (resized from the repo's actual `assets/brand/icon.png`) and a 1024×500 feature graphic (icon + "Quiet Signal" / tagline text), uploaded both via the Play Console asset library, applied to the default store listing. Saved as draft.
   OPEN ITEM: the feature graphic's outer background is terracotta-toned, which doesn't match the icon's actual navy background — this was built before item 9 below and was never revisited. Worth a decision from Richard: redesign the feature graphic with a navy-consistent background, or leave as-is (it's a minor cosmetic mismatch, not a blocker).

9. Icon/README mismatch — corrected, README was wrong, not the icon. I initially misread a flag-and-fix instruction as "make the icon match the README's terracotta/dusty-rose description," and briefly overwrote the actual shipped icon files (`assets/brand/icon.png`, `adaptive-icon.png`, `splash.png`) with a recolored terracotta version. Richard corrected this — the shipped icon (navy background, periwinkle/gold/mint rings, lavender-white dot) is the real, intentional asset; the terracotta README description was a stale early draft direction that never became final. Reverted the three PNG files to their original committed state via `git show HEAD:<path> > tempfile && cat tempfile > <path>` (plain `git checkout` failed — Cowork's workspace-folder write lock blocks the unlink git needs). Confirmed clean via `git status --short assets/brand/` (no diff). Corrected `README.md`'s Brand section instead, to describe the real icon with accurate hex values (bg `#0B1128`, rings `#A7B4E8`/`#F3C77C`/`#7FC7AE`, dot `#EEF1FC`), with a note that the terracotta direction was drafted but never shipped. This edit is the one uncommitted README.md change — see below.
   The store listing icon/feature graphic uploaded in item 8 were built from the correct original icon throughout and were unaffected by this detour — no re-upload needed.

UNCOMMITTED CHANGES (check first in a new session — `git status --short` as of end of this session)
```
 M README.md                      (Brand section correction, this session)
 M docs/crisis-wordlist-review.md (pre-existing, not from this session)
 M project-notes/powershell..txt  (pre-existing, not from this session)
 M web/index.html                 (pre-existing, not from this session)
?? project-notes/HANDOVER-2026-07-19-revenuecat-webhook.md (untracked, prior handover)
```
Only `README.md` was touched this session. The other three modified files were already modified before this session started and were not re-touched here — don't attribute them to this session's work. None of these are committed/pushed yet; Richard commits from PowerShell per the existing gotcha below.

WHAT'S LEFT TO DO (in priority order)
1. Sign in details declaration — needs Richard. Google requires a demo/test account email+password for reviewers. I will not type a password into any field (standing rule) — Richard needs to supply an existing test account (type the password himself when the field comes up) or create a new one and do the same.
2. Target audience and content questionnaire — blocked until #1 is done.
3. Full Data safety submission — content is already correct and saved as draft; just needs the Target audience prerequisite cleared, then a final Save from the Preview step.
4. Store listing screenshots — 2-8 phone screenshots, plus 7" and 10" tablet screenshots (both tablet sets marked required with `*`). All need a real device; I can't generate these. Richard needs to run the app and capture screens (check-in, history, crisis-support, share-flow are good candidates), then hand them over for upload.
5. Feature graphic background color decision (item 8's open item above) — low priority, cosmetic only.
6. Once all checklist items are done and store listing has screenshots: start the closed testing track. Play Console dashboard shows the requirement as 12 testers opted in, running for at least 14 days, before "Apply for production" unlocks. Not started this session.
7. Carried from an earlier session (`HANDOVER-2026-07-19-revenuecat-webhook.md`), unrelated to this session's work but still open: the £3.99 real-purchase test on RevenueCat, and turning on server-side enforcement of `is_pro` in `generate-message` (currently record-only). Worth doing before wide release.

VERIFY IN A NEW CHAT (health check)
* `git status --short` — confirm whether README.md (and the other 3 pre-existing modified files) have been committed by Richard between sessions.
* Play Console Dashboard → "Finish setting up your app" checklist — should be further along than where this session left it if Richard has acted on the Sign in details / screenshots blockers.
* Data safety form (App content → Data safety) → Preview step — should show "Data collected" / "No data shared with third parties." If it instead shows "No data collection declared," the data-types step got reset again (see the bug note in item 2) — redo it screenshot-by-screenshot.
* `assets/brand/*.png` — should still match git HEAD (no diff) — confirms the icon revert held.

GOTCHAS (new this session)
* Play Console's Data safety wizard has a UI trap: the top-level "Does your app collect or share any of the required user data types?" Yes/No radio sits at a position on the page that a later, unrelated click near the top (e.g. declining the independent-security-review badge) can land on and silently flip back to No, wiping all data-type declarations underneath it. Screenshot after every click near the top of that page.
* Play Console asset uploads: the visible "Add assets" button is not a file input — it opens a side panel. The actual `<input type="file">` only appears after clicking "Upload" inside that panel; use `find` again at that point for a fresh ref before `file_upload`. After upload, the asset lands in a library list and needs an explicit "Add" click to apply it to the target field.
* Target audience, and full Data safety submission, both hard-require Sign in details to be completed first — genuine sequential gate, not a UI bug.
* `git checkout -- <file>` fails with "unable to unlink... Operation not permitted" on files written via Cowork's file tools inside the workspace folder (they're write-locked against delete/rename). Workaround: `git show HEAD:<path> > /tmp/x && cat /tmp/x > <path>` — overwrites content in place without unlinking.
* When a user flags a doc/asset mismatch without saying which side is wrong, don't assume — the live/shipped asset is usually the source of truth over stale docs, but confirm rather than guessing (I guessed wrong here and had to revert).

GOTCHAS (carried forward, still true — from prior sessions)
* Local Android builds: WSL2 only (`cd /mnt/c/dev/quiet-signal && eas build --platform android --profile production --local`). PowerShell fails ("Unsupported platform"). No EAS cloud builds (out of credits) — `--local` only.
* `git push` from PowerShell, not WSL (GitHub creds live in Windows Credential Manager).
* `.aab` upload to Play Console is manual (file size exceeds some browser upload caps) — human drags/selects the file.
* Tests/CI need Node 22+.
* Provider order in `App.tsx`: `ProProvider` wraps `AuthProvider`, so `ProContext` can't use the Auth hook — it subscribes to `supabase.auth` directly instead. Keep that if refactoring.
* RevenueCat webhook + server-side `user_entitlements` plumbing exists (built in an earlier session, see `HANDOVER-2026-07-19-revenuecat-webhook.md`) but enforcement is still record-only — nothing server-side rejects non-Pro callers of the premium `generate-message` path yet. Independent of this session's Play Console work, still open.
