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
  // Selecting a photo already saves instantly (see BackgroundPrefsContext -
  // AsyncStorage.setItem happens on every tap, no separate save step exists
  // or is needed). What was missing was any visible sign that the tap did
  // something: this briefly shows "Saved" and collapses the picker back to
  // the updated thumbnail so it's obvious the change actually applied.
  const [justSavedKey, setJustSavedKey] = useState<BackgroundScreenKey | null>(null);

  const choosePhoto = (key: BackgroundScreenKey, id: BackgroundImageId) => {
    setBackground(key, id);
    setOpenKey(null);
    setJustSavedKey(key);
    setTimeout(() => setJustSavedKey((cur) => (cur === key ? null : cur)), 1500);
  };

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
                  {justSavedKey === key && (
                    <Text style={{ color: theme.success, fontSize: fontSizes.label, fontWeight: "600", marginTop: 2 }}>
                      Saved ✓
                    </Text>
                  )}
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
                  <Text style={{ color: theme.textMuted, fontSize: fontSizes.label, marginBottom: spacing.sm }}>
                    {Object.keys(BACKGROUND_IMAGES).length} photos to choose from
                  </Text>
                  {IMAGES_BY_CATEGORY.map(({ category, ids }) => (
                    <View key={category} style={{ marginBottom: spacing.md }}>
                      <Text style={[styles.categoryLabel, { color: theme.textMuted }]}>
                        {CATEGORY_LABELS[category]} ({ids.length})
                      </Text>
                      {/* A wrapping grid rather than a horizontal scroll row per
                          category - nesting a sideways-scrolling strip inside
                          the page's own vertical scroll made it easy to miss
                          every category after the first one. Everything here
                          is now reachable just by scrolling the page down. */}
                      <View style={styles.optionGrid}>
                        {ids.map((id) => (
                          <Pressable key={id} onPress={() => choosePhoto(key, id)}>
                            <Image
                              source={BACKGROUND_IMAGES[id].source}
                              style={[
                                styles.optionThumb,
                                { borderColor: id === currentId ? theme.primary : "transparent" },
                              ]}
                            />
                          </Pressable>
                        ))}
                      </View>
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
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionThumb: { width: 90, height: 120, borderRadius: radii.sm, borderWidth: 3 },
});
