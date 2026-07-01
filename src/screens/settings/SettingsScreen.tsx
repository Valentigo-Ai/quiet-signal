import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { spacing, fontSizes } from "@/lib/theme";
import { CRISIS_SAFETY_DISCLAIMER } from "@/constants/legalCopy";

// Section 4.7 - recipient management, notification prefs, data export,
// delete account, dark mode / high contrast, privacy notice, disclaimer.
export function SettingsScreen() {
  const { theme, isDark, highContrast, toggleDark, toggleHighContrast } = useAppTheme();
  const { signOut } = useAuth();
  const navigation = useNavigation<any>();

  const Row = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={[styles.row, { borderColor: theme.border, minHeight: theme.minTouchTarget }]}
      accessibilityRole="button"
    >
      <Text style={{ color: theme.text, fontSize: fontSizes.body }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={[styles.section, { color: theme.textMuted }]}>SHARING</Text>
        <Row label="Manage shared recipients" onPress={() => navigation.navigate("Recipients")} />

        <Text style={[styles.section, { color: theme.textMuted }]}>APPEARANCE</Text>
        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <Text style={{ color: theme.text }}>Dark mode</Text>
          <Switch value={isDark} onValueChange={toggleDark} />
        </View>
        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <Text style={{ color: theme.text }}>High contrast</Text>
          <Switch value={highContrast} onValueChange={toggleHighContrast} />
        </View>

        <Text style={[styles.section, { color: theme.textMuted }]}>YOUR DATA</Text>
        <Row label="Export my data" onPress={() => navigation.navigate("DataExport")} />
        <Row label="Privacy notice" onPress={() => navigation.navigate("PrivacyNotice")} />
        <Row label="Delete account" onPress={() => navigation.navigate("DeleteAccount")} />

        <Text style={[styles.disclaimer, { color: theme.textMuted }]}>{CRISIS_SAFETY_DISCLAIMER}</Text>

        <Row label="Log out" onPress={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { fontSize: 12, fontWeight: "700", marginTop: spacing.lg, marginBottom: spacing.sm, letterSpacing: 0.5 },
  row: { justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  disclaimer: { fontSize: 12, marginTop: spacing.xl, lineHeight: 18 },
});
