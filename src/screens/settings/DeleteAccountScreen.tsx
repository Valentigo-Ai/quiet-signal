import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes } from "@/lib/theme";

// Section 4.7 / 11.1 - genuinely easy account/data deletion. Deleting the
// auth.users row cascades (ON DELETE CASCADE, Section 6 migration) through
// profiles, checkins, recipients, shared_messages, journal_entries and
// journal_insights - immediate and irreversible, not just deactivation.
// Backed by the deployed `delete-account` edge function (service role),
// which verifies the caller's own JWT before deleting only that user.
export function DeleteAccountScreen() {
  const { theme } = useAppTheme();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      "Delete your account?",
      "This immediately and permanently deletes all your check-ins, journal entries, recipients, and shared history. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.functions.invoke("delete-account", { body: {} });
              if (error) throw error;
              await signOut();
            } catch (e: any) {
              Alert.alert("Couldn't delete account", e.message ?? String(e));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.body, { color: theme.text }]}>
        Deleting your account removes everything Quiet Signal has stored about you, right away - not
        just a deactivation. There's no getting it back.
      </Text>
      <PrimaryButton label="Delete my account" variant="danger" onPress={handleDelete} loading={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  body: { fontSize: fontSizes.body, lineHeight: 24, marginBottom: spacing.lg },
});
