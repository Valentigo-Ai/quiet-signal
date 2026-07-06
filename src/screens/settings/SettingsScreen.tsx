import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useCrisisCountry } from "@/context/CrisisCountryContext";
import { usePro } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { spacing, fontSizes } from "@/lib/theme";
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
  const tabBarHeight = useBottomTabBarHeight(); // tab bar now floats over content (see RootNavigator)
  const [pickerVisible, setPickerVisible] = useState(false);

  const Row = ({ label, subtitle, onPress }: { label: string; subtitle?: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { borderColor: theme.border, backgroundColor: theme.surface + "D9", minHeight: theme.minTouchTarget },
      ]}
      accessibilityRole="button"
    >
      <Text style={{ color: theme.text, fontSize: fontSizes.body }}>{label}</Text>
      {subtitle ? (
        <Text style={{ color: theme.textMuted, fontSize: fontSizes.label, marginTop: 2 }}>{subtitle}</Text>
      ) : null}
    </Pressable>
  );

  return (
    <ScreenBackground source={getSource("settings")}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarHeight + spacing.lg }}>
        <TextOnPhoto style={styles.sectionPill}>
          <Text style={[styles.section, { color: theme.textMuted }]}>QUIET SIGNAL PRO</Text>
        </TextOnPhoto>
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

        <TextOnPhoto style={styles.sectionPill}>
          <Text style={[styles.section, { color: theme.textMuted }]}>SHARING</Text>
        </TextOnPhoto>
        {/* Discoverability fix: this used to just say "Manage shared
            recipients", which doesn't tell a new user that this is where
            you set up who your check-ins go to, or that keeping everything
            private is just as valid a choice. Spelling that out here means
            people can set sharing up ahead of time in Settings, rather than
            only ever discovering it in the moment on the Share screen. */}
        <Row
          label="Choose who to share with, or keep it private"
          subtitle="Add the people you'd like to let know how you're doing - totally optional"
          onPress={() => navigation.navigate("Recipients")}
        />

        <TextOnPhoto style={styles.sectionPill}>
          <Text style={[styles.section, { color: theme.textMuted }]}>APPEARANCE</Text>
        </TextOnPhoto>
        <View style={[styles.switchRow, { borderColor: theme.border, backgroundColor: theme.surface + "D9" }]}>
          <Text style={{ color: theme.text }}>Dark mode</Text>
          <Switch value={isDark} onValueChange={toggleDark} />
        </View>
        <View style={[styles.switchRow, { borderColor: theme.border, backgroundColor: theme.surface + "D9" }]}>
          <Text style={{ color: theme.text }}>High contrast</Text>
          <Switch value={highContrast} onValueChange={toggleHighContrast} />
        </View>
        <Row label="Backgrounds" onPress={() => navigation.navigate("Backgrounds")} />

        <TextOnPhoto style={styles.sectionPill}>
          <Text style={[styles.section, { color: theme.textMuted }]}>SUPPORT</Text>
        </TextOnPhoto>
        <Row label={`Region for crisis resources: ${info.countryName}`} onPress={() => setPickerVisible(true)} />

        <TextOnPhoto style={styles.sectionPill}>
          <Text style={[styles.section, { color: theme.textMuted }]}>YOUR DATA</Text>
        </TextOnPhoto>
        <Row label="Export my data" onPress={() => navigation.navigate("DataExport")} />
        <Row label="Privacy notice" onPress={() => navigation.navigate("PrivacyNotice")} />
        <Row label="Delete account" onPress={() => navigation.navigate("DeleteAccount")} />

        <TextOnPhoto style={{ marginTop: spacing.xl }}>
          <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
            {getCrisisSafetyDisclaimer(info)}
          </Text>
        </TextOnPhoto>

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
  sectionPill: { marginTop: spacing.lg, marginBottom: spacing.sm },
  section: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  // Rounded frosted cards rather than flat hairline rows - matches the
  // History/Journal list rows and the website's frosted-card language.
  row: {
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  disclaimer: { fontSize: 12, lineHeight: 18 },
});
