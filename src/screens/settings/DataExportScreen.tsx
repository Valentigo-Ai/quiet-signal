import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// SDK 54 ships expo-file-system's newer File/Directory/Paths API - the
// older documentDirectory string constant + writeAsStringAsync()/
// EncodingType that most tutorials show is a different, older API surface
// that this installed version (19.x) no longer exposes at the top level.
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes } from "@/lib/theme";

// Section 4.7 / 11.1 - full data export, builds trust that the app won't
// trap the user's data.
//
// This used to call Share.share({ message: JSON.stringify(bundle) }) -
// dumping the whole export as plain text into the share sheet rather than
// an actual file, even though the copy below promises "a single file you
// control." That's not just a wording mismatch: a big text blob (months of
// check-ins, journal entries, shared messages) can silently get truncated
// or fail depending on which app someone picks to share to. Now it writes
// a real .json file to disk (same pattern as pdfReport.ts's PDF export)
// and hands that off instead - behaves like an actual download no matter
// what the person picks, and matches what the screen already promises.
export function DataExportScreen() {
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // shared_messages is filtered by checkin id, so it has to wait for
      // checkins to come back first - can't all run in one Promise.all
      // (that was the bug: it referenced checkins before it existed).
      const [{ data: checkins }, { data: journal }, { data: recipients }] = await Promise.all([
        supabase.from("checkins").select("*").eq("user_id", userId),
        supabase.from("journal_entries").select("*").eq("user_id", userId),
        supabase.from("recipients").select("*").eq("user_id", userId),
      ]);

      const checkinIds: string[] = (checkins ?? []).map((c: { id: string }) => c.id);
      const { data: shared } = await supabase
        .from("shared_messages")
        .select("id, message_text, sent_at, checkin_id, recipient_id")
        .in("checkin_id", checkinIds);

      const bundle = {
        exported_at: new Date().toISOString(),
        checkins,
        journal_entries: journal,
        recipients,
        shared_messages: shared,
      };
      const json = JSON.stringify(bundle, null, 2);
      const filename = `quiet-signal-export-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === "web") {
        // No native filesystem on web - a Blob + a throwaway <a download>
        // is the standard way to trigger a real file save in a browser.
        // Same idea as pdfReport.ts's web path for the PDF export.
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      const file = new File(Paths.document, filename);
      file.create({ overwrite: true });
      file.write(json);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Download your Quiet Signal data",
          UTI: "public.json",
        });
      } else {
        Alert.alert("Saved", `Your data was saved to:\n${file.uri}`);
      }
    } catch (e: any) {
      Alert.alert("Export failed", e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.body, { color: theme.text }]}>
        Download everything Quiet Signal has stored for you - check-ins, journal entries, recipients, and
        your shared-message history - as a single file you control.
      </Text>
      <PrimaryButton label="Export my data" onPress={handleExport} loading={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  body: { fontSize: fontSizes.body, lineHeight: 24, marginBottom: spacing.lg },
});
