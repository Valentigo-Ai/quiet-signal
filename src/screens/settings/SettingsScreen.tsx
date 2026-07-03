import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useCrisisCountry } from "@/context/CrisisCountryContext";
import { usePro } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { spacing, fontSizes, imageTextShadow } from "@/lib/theme";
import { getCrisisSafetyDisclaimer } from "@/constants/legalCopy";
import { RegionPicker } from "@/components/RegionPicker";

// Section 4.7 - recipient management, notification prefs, data export,
// delete account, dark mode / high contrast, privacy notice, disclaimer.
export function SettingsScreen() {
  const { theme, isDark, highContrast, toggleDark, toggleHighContrast } = useAppTheme();
  const { signOut } = useAuth();
  const { country, info, setCountry } = useCrisisCountry();
  const { isPro, _devSetPro } = usePro();
  const { getSource } = useBackgroundPrefs();
  const navigation = useNavigation<any>();
  const [pickerVisible, setPickerVisible] = useState(false);

  const Row = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { borderColor: theme.border, backgroundColor: theme.surface + "D9", minHeight: theme.minTouchTarget },
      ]}
      accessibilityRole="button"
    >
      <Text style={{ color: theme.text, fontSize: fontSizes.body }}>{label}</Text>
    </Pressable>
  );

  return (
    <ScreenBackground source={getSource("settings")}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={[styles.section, { color: theme.textMuted }, imageTextShadow]}>QUIET SIGNAL PRO</Text>
        <Row
          label={isPro ? "You're on Pro ✓" : "Upgrade to Pro"}
          onPress={() => navigation.navigate("Upgrade")}
        />
        {__DEV__ && (
          <View style={[styles.switchRow, { borderColor: theme.border, backgroundColor: theme.surface + "D9" }]}>
            <Text style={{ color: theme.textMuted, fontSize: fontSizes.label }}>Pro (testing toggle, dev only)</Text>
            <Switch value={isPro} onValueChange={_devSetPro} />
          </View>
        )}

        <Text style={[styles.section, { color: theme.textMuted }, imageTextShadow]}>SHARING</Text>
        <Row label="Manage shared recipients" onPress={() => navigation.navigate("Recipients")} />

        <Text style={[styles.section, { color: theme.textMuted }, imageTextShadow]}>APPEARANCE</Text>
        <View style={[styles.switchRow, { borderColor: theme.border, backgroundColor: theme.surface + "D9" }]}>
          <Text style={{ color: theme.text }}>Dark mode</Text>
          <Switch value={isDark} onValueChange={toggleDark} />
        </View>
        <View style={[styles.switchRow, { borderColor: theme.border, backgroundColor: theme.surface + "D9" }]}>
          <Text style={{ color: theme.text }}>High contrast</Text>
          <Switch value={highContrast} onValueChange={toggleHighContrast} />
        </View>
        <Row label="Backgrounds" onPress={() => navigation.navigate("Backgrounds")} />

        <Text style={[styles.section, { color: theme.textMuted }, imageTextShadow]}>SUPPORT</Text>
        <Row label={`Region for crisis resources: ${info.countryName}`} onPress={() => setPickerVisible(true)} />

        <Text style={[styles.section, { color: theme.textMuted }, imageTextShadow]}>YOUR DATA</Text>
        <Row label="Export my data" onPress={() => navigation.navigate("DataExport")} />
        <Row label="Privacy notice" onPress={() => navigation.navigate("PrivacyNotice")} />
        <Row label="Delete account" onPress={() => navigation.navigate("DeleteAccount")} />

        <Text style={[styles.disclaimer, { color: theme.textMuted }, imageTextShadow]}>
          {getCrisisSafetyDisclaimer(info)}
        </Text>

        <Row label="Log out" onPress={() => signOut()} />
      </ScrollView>

      <RegionPicker
        visible={pickerVisible}
        currentCountry={country}
        onSelect={setCountry}
        onClose={() => setPickerVisible(false)}
      />
    </ScreenBackground>
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
