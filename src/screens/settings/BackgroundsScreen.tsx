import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { usePro } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import {
  BACKGROUND_IMAGES,
  BACKGROUND_SCREEN_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  BackgroundImageId,
  BackgroundScreenKey,
} from "@/constants/backgroundLibrary";
import { spacing, fontSizes, radii, cardShadow } from "@/lib/theme";

const SCREEN_KEYS: BackgroundScreenKey[] = [
  "welcome",
  "checkin",
  "share",
  "history",
  "journal",
  "crisis",
  "recipients",
  "login",
  "signup",
  "settings",
];
const IMAGES_BY_CATEGORY = CATEGORY_ORDER.map((category) => ({
  category,
  ids: (Object.keys(BACKGROUND_IMAGES) as BackgroundImageId[]).filter(
    (id) => BACKGROUND_IMAGES[id].category === category
  ),
})).filter((group) => group.ids.length > 0);

// Pro feature (Section: Pro tier, July 2026) - lets the user pick any photo
// in the library for each screen slot. Free tier sees the defaults with an
// upsell instead of the picker.
export function BackgroundsScreen() {
  const { theme } = useAppTheme();
  const { isPro } = usePro();
  const navigation = useNavigation<any>();
  const { prefs, setBackground } = useBackgroundPrefs();
  const [openKey, setOpenKey] = useState<BackgroundScreenKey | null>(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {!isPro && (
          <View style={[styles.upsell, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, marginBottom: spacing.sm }}>
              Free plan uses a fixed photo per screen. Upgrade to Pro to pick any photo in the library.
            </Text>
            <Pressable onPress={() => navigation.navigate("Upgrade")}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>Upgrade to Pro</Text>
            </Pressable>
          </View>
        )}

        {SCREEN_KEYS.map((key) => {
          const currentId = prefs[key];
          const isOpen = openKey === key;
          return (
            <View key={key} style={[styles.section, cardShadow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <Image source={BACKGROUND_IMAGES[currentId].source} style={styles.currentThumb} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ color: theme.text, fontWeight: "700" }}>{BACKGROUND_SCREEN_LABELS[key]}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: fontSizes.label }}>
                    {BACKGROUND_IMAGES[currentId].label}
                  </Text>
                </View>
                <Pressable
                  onPress={() => (isPro ? setOpenKey(isOpen ? null : key) : navigation.navigate("Upgrade"))}
                  style={[styles.changeButton, { backgroundColor: theme.primarySoft, minHeight: theme.minTouchTarget }]}
                >
                  <Text style={{ color: theme.text, fontWeight: "600" }}>{isPro ? (isOpen ? "Close" : "Change") : "Pro"}</Text>
                </Pressable>
              </View>

              {isOpen && isPro && (
                <View style={{ marginTop: spacing.md }}>
                  {IMAGES_BY_CATEGORY.map(({ category, ids }) => (
                    <View key={category} style={{ marginBottom: spacing.md }}>
                      <Text style={[styles.categoryLabel, { color: theme.textMuted }]}>
                        {CATEGORY_LABELS[category]}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {ids.map((id) => (
                          <Pressable key={id} onPress={() => setBackground(key, id)} style={{ marginRight: spacing.sm }}>
                            <Image
                              source={BACKGROUND_IMAGES[id].source}
                              style={[
                                styles.optionThumb,
                                { borderColor: id === currentId ? theme.primary : "transparent" },
                              ]}
                            />
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  upsell: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  section: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center" },
  currentThumb: { width: 56, height: 56, borderRadius: radii.sm },
  changeButton: { paddingHorizontal: spacing.md, borderRadius: radii.sm, justifyContent: "center" },
  categoryLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.xs },
  optionThumb: { width: 72, height: 96, borderRadius: radii.sm, borderWidth: 3 },
});
