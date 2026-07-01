import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes } from "@/lib/theme";

// Section 4.7 / 11.1 - full data export, builds trust that the app won't
// trap the user's data. MVP: bundles the user's own rows as JSON and hands
// off to the OS share sheet (save to Files, email to self, etc.).
export function DataExportScreen() {
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const [{ data: checkins }, { data: journal }, { data: recipients }, { data: shared }] = await Promise.all([
        supabase.from("checkins").select("*").eq("user_id", userId),
        supabase.from("journal_entries").select("*").eq("user_id", userId),
        supabase.from("recipients").select("*").eq("user_id", userId),
        supabase
          .from("shared_messages")
          .select("id, message_text, sent_at, checkin_id, recipient_id")
          .in("checkin_id", (checkins ?? []).map((c) => c.id)),
      ]);

      const bundle = {
        exported_at: new Date().toISOString(),
        checkins,
        journal_entries: journal,
        recipients,
        shared_messages: shared,
      };

      await Share.share({
        title: "Quiet Signal data export",
        message: JSON.stringify(bundle, null, 2),
      });
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
