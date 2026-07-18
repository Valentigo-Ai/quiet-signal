import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export const LAST_ACK_KEY = "quiet-signal:last-crisis-ack";

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
// surface re-appears on subsequent app opens, so it can't be silently missed.
export function useCrisisCheck() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const lastAck = (await AsyncStorage.getItem(LAST_ACK_KEY)) ?? "1970-01-01T00:00:00.000Z";

      const [journal, checkins] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id, created_at")
          .eq("flagged_crisis", true)
          .gt("created_at", lastAck)
          .limit(1),
        supabase
          .from("checkins")
          .select("id, created_at")
          .eq("flagged_crisis", true)
          .gt("created_at", lastAck)
          .limit(1),
      ]);

      const hasFlag =
        (!journal.error && (journal.data?.length ?? 0) > 0) ||
        (!checkins.error && (checkins.data?.length ?? 0) > 0);

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
