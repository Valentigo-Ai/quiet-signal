import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

const LAST_ACK_KEY = "quiet-signal:last-crisis-ack";

// Flow D (Section 4.5/5): on every app open, check whether the nightly
// safety job flagged a journal entry since we last acknowledged. If so,
// surface the Crisis Resources screen automatically, gently, before
// anything else. This is a signpost only - no other automated action.
export function useCrisisCheck() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const lastAck = (await AsyncStorage.getItem(LAST_ACK_KEY)) ?? "1970-01-01T00:00:00.000Z";

      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, created_at")
        .eq("flagged_crisis", true)
        .gt("created_at", lastAck)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled || error || !data || data.length === 0) return;

      await AsyncStorage.setItem(LAST_ACK_KEY, new Date().toISOString());
      navigation.navigate("CrisisResources", { autoShown: true });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
