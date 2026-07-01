import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSizes } from "@/lib/theme";

// Persistent, always-reachable entry point to crisis resources (Section 4.6).
// Rendered as a slim banner/tab rather than buried in Settings.
export function CrisisBanner() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();

  return (
    <Pressable
      onPress={() => navigation.navigate("CrisisResources")}
      accessibilityRole="button"
      accessibilityLabel="Open crisis resources"
      style={[styles.banner, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}
    >
      <Text style={[styles.text, { color: theme.text }]}>Need urgent support? Tap here.</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  text: { fontSize: fontSizes.label, textAlign: "center", fontWeight: "500" },
});
