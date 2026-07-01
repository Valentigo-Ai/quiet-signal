import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSizes } from "@/lib/theme";
import { PRIVACY_NOTICE_MARKDOWN } from "@/constants/legalCopy";

// Section 11.2 - plain-language privacy notice, linked from onboarding,
// Settings, and (separately) the Play Store listing.
export function PrivacyNoticeScreen() {
  const { theme } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={[styles.body, { color: theme.text }]}>{PRIVACY_NOTICE_MARKDOWN}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { fontSize: fontSizes.body, lineHeight: 24 },
});
