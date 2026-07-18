import React, { useState } from "react";
import { View, Text, StyleSheet, Linking, Pressable, ScrollView } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { useCrisisCountry } from "@/context/CrisisCountryContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { spacing, fontSizes, radii, cardShadow, fonts } from "@/lib/theme";
import {
  CrisisResource,
  getCrisisDisclaimer,
  getGeneralResources,
  getVeteranResources,
} from "@/constants/crisisResources";
import { RegionPicker } from "@/components/RegionPicker";
import { acknowledgeCrisisSurface } from "@/lib/useCrisisCheck";

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
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tabBarHeight = useBottomTabBarHeight(); // tab bar now floats over content (see RootNavigator)
  const [pickerVisible, setPickerVisible] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Was this screen opened automatically by the safety net (useCrisisCheck)
  // rather than tapped to by the person? If so, we show a warm acknowledgement
  // card explaining, gently, why it appeared - instead of silently dropping
  // them onto a list of helplines with no context (the old behaviour). The
  // card is dismissed with an explicit tap, which is the ONLY thing that
  // advances the acknowledgement timestamp; until then it re-appears on next
  // app open so it can't be missed. See src/lib/useCrisisCheck.ts.
  const wasAutoShown = route.params?.autoShown === true && !acknowledged;

  const handleAcknowledge = async () => {
    await acknowledgeCrisisSurface();
    setAcknowledged(true);
    // Clear the param so switching tabs / re-focusing this screen later
    // doesn't re-show the card outside of a genuine new flag.
    navigation.setParams({ autoShown: false });
  };

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
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarHeight + spacing.lg }}>
        <TextOnPhoto style={{ marginBottom: spacing.md }}>
          <Text style={[styles.title, { color: theme.text }]}>Support</Text>
        </TextOnPhoto>

        {wasAutoShown && (
          <View
            style={[styles.ackCard, cardShadow, { backgroundColor: theme.surface, borderColor: theme.primary }]}
            accessibilityLiveRegion="polite"
          >
            <Text style={[styles.ackHeading, { color: theme.text }]}>
              Support is here whenever you need it
            </Text>
            <Text style={[styles.ackBody, { color: theme.textMuted }]}>
              We brought you here gently because something in a recent entry made us want to make sure
              these are close by. There's nothing you have to do, and you're not in any trouble - this is
              just here if it helps. If things feel urgent, the services below are free and open right now.
            </Text>
            <Pressable
              onPress={handleAcknowledge}
              style={[styles.ackButton, { backgroundColor: theme.primary, minHeight: theme.minTouchTarget }]}
              accessibilityRole="button"
              accessibilityLabel="OK, I understand"
            >
              <Text style={[styles.ackButtonText, { color: theme.onPrimary ?? "#fff" }]}>OK, I understand</Text>
            </Pressable>
          </View>
        )}

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

        <TextOnPhoto style={styles.disclaimerPill}>
          <Text style={[styles.disclaimer, { color: theme.danger }]}>{getCrisisDisclaimer(info)}</Text>
        </TextOnPhoto>

        {generalResources.map((r) => (
          <ResourceCard key={r.name} r={r} />
        ))}

        {veteranResources.length > 0 && (
          <>
            <TextOnPhoto style={{ marginBottom: spacing.xs }}>
              <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>FOR VETERANS & MILITARY FAMILIES</Text>
            </TextOnPhoto>
            <TextOnPhoto style={{ marginBottom: spacing.sm }}>
              <Text style={[styles.sectionNote, { color: theme.textMuted }]}>
                If that's you, here are some services specifically for you.
              </Text>
            </TextOnPhoto>
            {veteranResources.map((r) => (
              <ResourceCard key={r.name} r={r} />
            ))}
          </>
        )}

        <TextOnPhoto style={{ alignSelf: "center", marginTop: spacing.lg }}>
          <Text style={[styles.footer, { color: theme.textMuted }]}>
            If you're in immediate danger, please call {info.emergencyNumber}.
          </Text>
        </TextOnPhoto>
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
  title: { fontSize: fontSizes.largeTitle, fontFamily: fonts.heading },
  ackCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  ackHeading: { fontSize: fontSizes.title, fontFamily: fonts.heading, marginBottom: spacing.xs },
  ackBody: { fontSize: fontSizes.label, lineHeight: 22, marginBottom: spacing.md },
  ackButton: { borderRadius: 10, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  ackButtonText: { fontWeight: "700", fontSize: fontSizes.body },
  regionRow: { borderWidth: 1, borderRadius: 10, padding: spacing.sm, marginBottom: spacing.md },
  disclaimerPill: { marginBottom: spacing.lg },
  disclaimer: { fontSize: fontSizes.label, lineHeight: 22 },
  sectionHeading: { fontSize: 12, fontFamily: fonts.bodyBold, letterSpacing: 0.5 },
  sectionNote: { fontSize: fontSizes.label },
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  name: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  description: { fontSize: fontSizes.label, marginBottom: spacing.sm },
  callButton: { borderRadius: 10, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  footer: { textAlign: "center", fontSize: fontSizes.label },
});
