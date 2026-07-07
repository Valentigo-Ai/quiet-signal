import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { usePro } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import {
  BACKGROUND_IMAGES,
  BACKGROUND_SCREEN_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  BackgroundCategory,
  BackgroundImageId,
  BackgroundScreenKey,
  isFreeBackground,
  FREE_BACKGROUND_IDS,
  DEFAULT_BACKGROUNDS,
} from "@/constants/backgroundLibrary";
import { spacing, fontSizes, radii, cardShadow } from "@/lib/theme";

// The full free set for a given screen: the three signature free photos plus
// that screen's own default (which for a few screens - share, journal,
// crisis, recipients, login - isn't one of the three, so it'd otherwise be
// invisible as "free" unless someone happened to scroll to it in its
// category). De-duped since several screens' defaults already are one of
// the three.
function freeIdsForScreen(key: BackgroundScreenKey): BackgroundImageId[] {
  return Array.from(new Set<BackgroundImageId>([...FREE_BACKGROUND_IDS, DEFAULT_BACKGROUNDS[key]]));
}

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
  // Which category's photo grid is expanded within the open screen-key
  // section. Previously every category rendered all its full-resolution
  // photos at once as soon as a screen's picker opened - 63 photos decoding
  // simultaneously, which is enough to blow past Android's Fresco image
  // pipeline's concurrent-decode memory ceiling. When that happens, Image
  // just renders blank (no error, no crash) while its layout box still
  // reserves space - that's exactly the "empty grid slots" bug from device
  // screenshots, worse for categories later in CATEGORY_ORDER since memory
  // pressure compounds as more images ahead of them get decoded first. Now
  // only one category's photos (5-14 of them, not 63) are ever mounted at a
  // time.
  const [openCategory, setOpenCategory] = useState<BackgroundCategory | null>(null);
  // Selecting a photo already saves instantly (see BackgroundPrefsContext -
  // AsyncStorage.setItem happens on every tap, no separate save step exists
  // or is needed). What was missing was any visible sign that the tap did
  // something: this briefly shows "Saved" and collapses the picker back to
  // the updated thumbnail so it's obvious the change actually applied.
  const [justSavedKey, setJustSavedKey] = useState<BackgroundScreenKey | null>(null);

  const choosePhoto = (key: BackgroundScreenKey, id: BackgroundImageId) => {
    // Free users can pick any of the free looks; a locked photo routes to
    // the Upgrade screen (same rule as the check-in gallery).
    if (!isPro && !isFreeBackground(key, id)) {
      navigation.navigate("Upgrade");
      return;
    }
    setBackground(key, id);
    setOpenKey(null);
    setOpenCategory(null);
    setJustSavedKey(key);
    setTimeout(() => setJustSavedKey((cur) => (cur === key ? null : cur)), 1500);
  };

  const toggleKey = (key: BackgroundScreenKey) => {
    setOpenKey((cur) => (cur === key ? null : key));
    setOpenCategory(null); // start collapsed - don't carry an expanded category into a different screen's picker
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {!isPro && (
          <View style={[styles.upsell, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, marginBottom: spacing.sm }}>
              Free includes three looks for every screen. Pro unlocks the whole library.
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
                <View style={styles.currentThumbWrap}>
                  <Image source={BACKGROUND_IMAGES[currentId].source} resizeMode="cover" style={styles.currentThumb} />
                </View>
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
                  onPress={() => toggleKey(key)}
                  style={[styles.changeButton, { backgroundColor: theme.primarySoft, minHeight: theme.minTouchTarget }]}
                >
                  <Text style={{ color: theme.text, fontWeight: "600" }}>{isOpen ? "Close" : "Change"}</Text>
                </Pressable>
              </View>

              {isOpen && (
                <View style={{ marginTop: spacing.md }}>
                  {/* One place to see every free option for this screen, up
                      front - no need to open a category and spot the "Free"
                      badge among locked photos. This is exactly the same set
                      isFreeBackground already treats as free for taps: the
                      three signature photos plus this screen's own default.
                      Pro users see none of this - once everything's unlocked,
                      "free" isn't a meaningful distinction any more, so it'd
                      just be visual noise ahead of the real library. */}
                  {!isPro && (
                    <View style={{ marginBottom: spacing.md }}>
                      <Text style={[styles.categoryLabel, { color: theme.textMuted, marginBottom: spacing.xs }]}>
                        FREE IMAGES ({freeIdsForScreen(key).length})
                      </Text>
                      <View style={styles.optionGrid}>
                        {freeIdsForScreen(key).map((id) => (
                          <Pressable
                            key={id}
                            onPress={() => choosePhoto(key, id)}
                            style={[
                              styles.optionThumbWrap,
                              { borderColor: id === currentId ? theme.primary : "transparent" },
                            ]}
                          >
                            <Image
                              source={BACKGROUND_IMAGES[id].source}
                              resizeMode="cover"
                              style={styles.optionThumb}
                            />
                            <View style={styles.freeBadge}>
                              <Text style={styles.freeBadgeText}>Free</Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                  <Text style={{ color: theme.textMuted, fontSize: fontSizes.label, marginBottom: spacing.sm }}>
                    {Object.keys(BACKGROUND_IMAGES).length} photos to choose from
                  </Text>
                  {IMAGES_BY_CATEGORY.map(({ category, ids }) => {
                    const isCategoryOpen = openCategory === category;
                    return (
                      <View key={category} style={{ marginBottom: spacing.sm }}>
                        <Pressable
                          onPress={() => setOpenCategory((cur) => (cur === category ? null : category))}
                          style={[styles.categoryRow, { minHeight: theme.minTouchTarget }]}
                        >
                          <Text style={[styles.categoryLabel, { color: theme.textMuted }]}>
                            {CATEGORY_LABELS[category]} ({ids.length})
                          </Text>
                          <Text style={{ color: theme.primary, fontWeight: "600" }}>
                            {isCategoryOpen ? "Hide" : "Show"}
                          </Text>
                        </Pressable>
                        {/* Only the expanded category's photos are mounted - see
                            the note on openCategory above for why. A wrapping
                            grid rather than a horizontal scroll row, too:
                            nesting a sideways-scrolling strip inside the
                            page's own vertical scroll made it easy to miss
                            photos after the first row. */}
                        {isCategoryOpen && (
                          <View style={styles.optionGrid}>
                            {ids.map((id) => {
                              const free = isFreeBackground(key, id);
                              const locked = !isPro && !free;
                              return (
                                <Pressable
                                  key={id}
                                  onPress={() => choosePhoto(key, id)}
                                  style={[
                                    styles.optionThumbWrap,
                                    { borderColor: id === currentId ? theme.primary : "transparent" },
                                  ]}
                                >
                                  <Image
                                    source={BACKGROUND_IMAGES[id].source}
                                    resizeMode="cover"
                                    style={styles.optionThumb}
                                  />
                                  {locked && (
                                    <View style={styles.lockBadge}>
                                      <Ionicons name="lock-closed" size={11} color="#EEF1FC" />
                                    </View>
                                  )}
                                  {/* Free tier only needs to see this - once someone
                                      is Pro, everything's unlocked and the distinction
                                      is meaningless. Marks exactly the same set
                                      isFreeBackground already unlocks for taps: the
                                      three signature free photos plus this screen's
                                      own default (per Richard, so free users can see
                                      at a glance what's actually free vs Pro-only,
                                      instead of only inferring it from the absence of
                                      a lock icon). */}
                                  {!isPro && free && (
                                    <View style={styles.freeBadge}>
                                      <Text style={styles.freeBadgeText}>Free</Text>
                                    </View>
                                  )}
                                </Pressable>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
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
  // The "white border" here isn't a rounding/clipping bug - every photo in
  // assets/backgrounds/*.jpg has a solid white letterbox band baked into
  // the file itself, top and bottom, averaging ~22% of the image's height
  // (confirmed across all 63 files - misty-water.jpg, the one outsized
  // outlier, has since been re-cropped at the source so it's no longer a
  // special case). It's invisible on full-screen backgrounds because that
  // view crops far more than 22% off a portrait photo stretched behind a
  // whole screen, but these small, squarer preview crops don't crop nearly
  // enough by default to clear it. Fix is the same as
  // BackgroundTeaserGallery: a fixed-size overflow:hidden wrapper draws the
  // actual crop window, and the Image inside it is oversized to 150% +
  // centered (not a transform: scale - that scales an already-rendered
  // raster and comes out visibly blurry; sizing the element itself keeps
  // the cover-fit sampling straight from the full-res source).
  currentThumbWrap: { position: "relative", width: 56, height: 56, borderRadius: radii.sm, overflow: "hidden" },
  currentThumb: {
    position: "absolute",
    width: "150%",
    height: "150%",
    top: "-25%",
    left: "-25%",
    backgroundColor: "transparent",
  },
  changeButton: { paddingHorizontal: spacing.md, borderRadius: radii.sm, justifyContent: "center" },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  categoryLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  optionThumbWrap: { position: "relative", width: 90, height: 120, borderRadius: radii.sm, overflow: "hidden", borderWidth: 3 },
  optionThumb: {
    position: "absolute",
    width: "150%",
    height: "150%",
    top: "-25%",
    left: "-25%",
    backgroundColor: "transparent",
  },
  lockBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,17,40,0.75)",
  },
  freeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(243,199,124,0.92)", // theme.primary (gold), opaque enough to read on any photo
  },
  freeBadgeText: { fontSize: 10, fontWeight: "700", color: "#3B2508" }, // matches theme.onPrimary
});
