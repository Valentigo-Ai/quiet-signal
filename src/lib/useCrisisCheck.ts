import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { reportDataError } from "@/lib/sentry";

export const LAST_ACK_KEY = "quiet-signal:last-crisis-ack";

// How long after the nightly scan raises a flag we keep auto-surfacing the
// crisis screen for it. Without this the surface has no expiry at all: the
// only thing that ever retired a flag was the local acknowledgement
// timestamp, so a flag stayed live forever on any device that had never
// acknowledged it - which is exactly what a fresh install is. Reinstalling a
// build wipes AsyncStorage (the Supabase session lives there too, which is
// why a new build always asks you to log in again), so LAST_ACK_KEY reset to
// its 1970 default while the flagged rows sat untouched in the database, and
// a two-day-old flag resurfaced on every install. A new device or a
// reinstalling user would have hit the same thing.
//
// Deliberately measured from the scan timestamp (note_scanned_at /
// processed_at), NOT from the entry's created_at. The scan runs at 03:00, so
// an entry written at 14:00 isn't flagged until 13 hours later - a 24h window
// on created_at would leave only ~11 hours of real visibility, and an entry
// written just after 03:00 would be flagged ~27 hours after created_at and so
// could expire before it was ever shown. Both columns are written in the same
// update as flagged_crisis (see nightly-journal-scan), so every flagged row
// has one.
const CRISIS_WINDOW_HOURS = 24;

// Marks the auto-shown crisis surface as acknowledged. Called ONLY when the
// person explicitly taps "OK" on the gentle acknowledgement card (see
// CrisisResourcesScreen), never automatically. Advancing the timestamp here
// - rather than at show-time - is deliberate: if we advanced it the moment
// we surfaced the screen (the old behaviour), a person who didn't notice the
// tab had switched, and tapped back to Today, would never be shown it again
// for that flag. Now the surface re-appears on each app open until it is
// actually acknowledged once.
export async function acknowledgeCrisisSurface(): Promise<void> {
  await AsyncStorage.setItem(LAST_ACK_KEY, new Date().toISOString());
}

// Flow D (Section 4.5/5): on every app open, check whether the nightly
// safety job flagged a journal entry OR a check-in note since we last
// acknowledged (both are scanned as of the July 2026 safety review). If so,
// surface the Crisis Resources screen automatically, gently, before
// anything else. This is a signpost only - no other automated action.
//
// NOTE: this hook no longer advances the acknowledgement timestamp itself.
// It only surfaces the screen (with autoShown so the screen shows a warm,
// dismissible acknowledgement card). The timestamp is advanced only when the
// person taps "OK" on that card (acknowledgeCrisisSurface). Until then the
// surface re-appears on subsequent app opens, so it can't be silently missed -
// but only for CRISIS_WINDOW_HOURS after the flag was raised, so an old flag
// can't follow someone around once they're through the moment it came from.
export function useCrisisCheck() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const lastAck = (await AsyncStorage.getItem(LAST_ACK_KEY)) ?? "1970-01-01T00:00:00.000Z";
      const scannedSince = new Date(
        Date.now() - CRISIS_WINDOW_HOURS * 60 * 60 * 1000
      ).toISOString();

      // Both tables are already owner-scoped by RLS, but scope them here too
      // rather than relying on the policy alone - the July 2026 review found a
      // precedence bug in checkins_select_own that left one disjunct with no
      // ownership test at all, and these two reads would have silently picked
      // up another account's flags. If there's no session yet there's nothing
      // to check against, so bail rather than send user_id=eq.undefined.
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId || cancelled) return;

      const [journal, checkins] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id, created_at")
          .eq("user_id", userId)
          .eq("flagged_crisis", true)
          .gt("created_at", lastAck)
          .gte("processed_at", scannedSince)
          .limit(1),
        supabase
          .from("checkins")
          .select("id, created_at")
          .eq("user_id", userId)
          .eq("flagged_crisis", true)
          .gt("created_at", lastAck)
          .gte("note_scanned_at", scannedSince)
          .limit(1),
      ]);

      // A read error here is silent-failure-shaped: swallowing it would
      // mean "couldn't check" reads identically to "checked, nothing
      // found," and this check is what gates the auto-surfaced crisis
      // screen. Report it and default to showing the screen on
      // uncertainty - a false-positive prompt costs a dismiss tap; a
      // false negative could hide a real flag.
      if (journal.error) reportDataError(journal.error, "crisis-check", { source: "journal" });
      if (checkins.error) reportDataError(checkins.error, "crisis-check", { source: "checkins" });

      const hasFlag =
        Boolean(journal.error) ||
        Boolean(checkins.error) ||
        (journal.data?.length ?? 0) > 0 ||
        (checkins.data?.length ?? 0) > 0;

      if (cancelled || !hasFlag) return;

      // Surface only - the timestamp advances when the person acknowledges.
      navigation.navigate("CrisisResources", { autoShown: true });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
