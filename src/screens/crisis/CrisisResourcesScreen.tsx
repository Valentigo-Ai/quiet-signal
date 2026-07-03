import React, { useState } from "react";
import { View, Text, StyleSheet, Linking, Pressable, ScrollView } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { useCrisisCountry } from "@/context/CrisisCountryContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { spacing, fontSizes, radii, cardShadow, imageTextShadow, fonts } from "@/lib/theme";
import {
  CrisisResource,
  getCrisisDisclaimer,
  getGeneralResources,
  getVeteranResources,
} from "@/constants/crisisResources";
import { RegionPicker } from "@/components/RegionPicker";

// Section 4.6 / 11.5 - always accessible, plainly worded, accurate contact
// info only. No claims about confidentiality. Never attempts to respond to
// or assess a crisis itself - signposting only. Resources shown are
// country-specific (Section 4.6 update, July 2026) based on the device's
// detected region, with a manual override below. Split into "General
// support" and "Military & veteran support" since not everyone using the
// app is military-connected (Section 4.6 update, July 2026).
export function CrisisResourcesScreen() {
  const { theme } = useAppTheme();
  const { country, info, setCountry } = useCrisisCountry();
  const { getSource } = useBackgroundPrefs();
  const [pickerVisible, setPickerVisible] = useState(false);

  const generalResources = getGeneralResources(info);
  const veteranResources = getVeteranResources(info);

  const ResourceCard = ({ r }: { r: CrisisResource }) => (
    <View style={[styles.card, cardShadow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.name, { color: theme.text }]}>{r.name}</Text>
      <Text style={[styles.description, { color: theme.textMuted }]}>{r.description}</Text>
      {r.phone ? (
        <Pressable
          onPress={() => r.callHref && Linking.openURL(r.callHref)}
          style={[styles.callButton, { backgroundColor: theme.primarySoft, minHeight: theme.minTouchTarget }]}
          accessibilityRole="button"
          accessibilityLabel={`Call ${r.name} on ${r.phone}`}
        >
          <Text style={{ color: theme.text, fontWeight: "600" }}>Call {r.phone}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <ScreenBackground source={getSource("crisis")}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={[styles.title, { color: theme.text }, imageTextShadow]}>Support</Text>

        <Pressable
          onPress={() => setPickerVisible(true)}
          style={[styles.regionRow, { borderColor: theme.border, backgroundColor: theme.surface + "D9" }]}
          accessibilityRole="button"
          accessibilityLabel={`Region: ${info.countryName}. Tap to change.`}
        >
          <Text style={{ color: theme.textMuted, fontSize: fontSizes.label }}>
            Showing resources for {info.countryName} · Change
          </Text>
        </Pressable>

        <Text style={[styles.disclaimer, { color: theme.danger }, imageTextShadow]}>{getCrisisDisclaimer(info)}</Text>

        {generalResources.map((r) => (
          <ResourceCard key={r.name} r={r} />
        ))}

        {veteranResources.length > 0 && (
          <>
            <Text style={[styles.sectionHeading, { color: theme.textMuted }, imageTextShadow]}>FOR VETERANS & MILITARY FAMILIES</Text>
            <Text style={[styles.sectionNote, { color: theme.textMuted }, imageTextShadow]}>
              If that's you, here are some services specifically for you.
            </Text>
            {veteranResources.map((r) => (
              <ResourceCard key={r.name} r={r} />
            ))}
          </>
        )}

        <Text style={[styles.footer, { color: theme.textMuted }, imageTextShadow]}>
          If you're in immediate danger, please call {info.emergencyNumber}.
        </Text>
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
  title: { fontSize: fontSizes.largeTitle, fontFamily: fonts.heading, marginBottom: spacing.md },
  regionRow: { borderWidth: 1, borderRadius: 10, padding: spacing.sm, marginBottom: spacing.md },
  disclaimer: { fontSize: fontSizes.label, marginBottom: spacing.lg, lineHeight: 22 },
  sectionHeading: { fontSize: 12, fontFamily: fonts.bodyBold, letterSpacing: 0.5, marginBottom: spacing.xs },
  sectionNote: { fontSize: fontSizes.label, marginBottom: spacing.sm },
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  name: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  description: { fontSize: fontSizes.label, marginBottom: spacing.sm },
  callButton: { borderRadius: 10, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  footer: { textAlign: "center", marginTop: spacing.lg, fontSize: fontSizes.label },
});
