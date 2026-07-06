import React, { useMemo } from "react";
import { View, Text, Image, Pressable, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { usePro } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import {
  BACKGROUND_IMAGES,
  BackgroundImageId,
  BackgroundScreenKey,
  isFreeBackground,
} from "@/constants/backgroundLibrary";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { spacing, fontSizes, radii, fonts } from "@/lib/theme";

const ALL_IDS = Object.keys(BACKGROUND_IMAGES) as BackgroundImageId[];
const CARD_WIDTH = 108;
const CARD_HEIGHT = 144;
const CARD_GAP = spacing.sm + 2;
const ITEM_STRIDE = CARD_WIDTH + CARD_GAP;

// Calm-style horizontal background gallery (Section: Pro tier; reworked
// July 2026 per Richard). Free users get three real looks - the free
// signature photos plus this screen's default - shown first in the strip;
// everything else carries a small lock badge in the top corner and routes
// to the Upgrade screen, exactly the Calm home-screen pattern of browsable,
// window-shoppable locked content. Cards are large and titled so the strip
// reads as a considered gallery, not a row of thumbnails.
//
// Sits below the "Log today" action in CheckInScreen, not above it: the
// daily check-in has to stay the fast, uncluttered thing it's designed to
// be (Section 4.2, under-15-seconds target).
//
// Uses FlatList (not ScrollView) deliberately - BackgroundsScreen already
// hit a real bug from mounting many full-res photos at once (Android's
// Fresco image pipeline blowing its concurrent-decode budget, photos
// rendering blank with no error). FlatList only mounts a small window of
// items regardless of how many of the 63 exist.
export function BackgroundTeaserGallery({ screenKey }: { screenKey: BackgroundScreenKey }) {
  const { theme } = useAppTheme();
  const { isPro } = usePro();
  const { prefs, setBackground } = useBackgroundPrefs();
  const navigation = useNavigation<any>();
  const currentId = prefs[screenKey];

  // Free (unlocked) looks lead the strip, so a free user's first swipe is
  // three things they can actually have - generosity first, locks second.
  const orderedIds = useMemo(() => {
    const free = ALL_IDS.filter((id) => isFreeBackground(screenKey, id));
    const locked = ALL_IDS.filter((id) => !isFreeBackground(screenKey, id));
    return [...free, ...locked];
  }, [screenKey]);

  const handlePress = (id: BackgroundImageId) => {
    const locked = !isPro && !isFreeBackground(screenKey, id);
    if (locked) {
      navigation.navigate("Upgrade");
      return;
    }
    // Instant live preview - this changes the exact background the strip is
    // sitting on. The context's setBackground enforces the free/Pro rule too.
    setBackground(screenKey, id);
  };

  return (
    <View style={{ marginTop: spacing.xl }}>
      <TextOnPhoto style={styles.headerPill}>
        <Text style={{ color: theme.text, fontFamily: fonts.bodyBold }}>Backgrounds</Text>
        <Text style={{ color: theme.textMuted, fontSize: fontSizes.label, marginTop: 2 }}>
          {isPro
            ? "Tap a photo to use it here"
            : `Three looks free · Pro unlocks all ${ALL_IDS.length}`}
        </Text>
      </TextOnPhoto>
      <FlatList
        data={orderedIds}
        keyExtractor={(id) => id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: CARD_GAP, paddingRight: spacing.lg }}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(_, index) => ({ length: ITEM_STRIDE, offset: ITEM_STRIDE * index, index })}
        renderItem={({ item: id }) => {
          const locked = !isPro && !isFreeBackground(screenKey, id);
          const selected = id === currentId;
          return (
            <Pressable
              onPress={() => handlePress(id)}
              style={styles.cardWrap}
              accessibilityRole="button"
              accessibilityLabel={`${BACKGROUND_IMAGES[id].label}${locked ? ", Pro" : selected ? ", in use" : ""}`}
            >
              <View style={styles.thumbWrap}>
                <Image
                  source={BACKGROUND_IMAGES[id].source}
                  style={[styles.thumb, { borderColor: selected ? theme.primary : "transparent" }]}
                />
                {locked && (
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={11} color="#EEF1FC" />
                  </View>
                )}
                {selected && !locked && (
                  <View style={[styles.selectedBadge, { backgroundColor: theme.primary }]}>
                    <Ionicons name="checkmark" size={11} color={theme.onPrimary} />
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={[styles.cardLabel, { color: theme.text }]}>
                {BACKGROUND_IMAGES[id].label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerPill: { alignSelf: "flex-start", marginBottom: spacing.sm },
  cardWrap: { width: CARD_WIDTH },
  thumbWrap: { position: "relative" },
  thumb: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: radii.md, borderWidth: 2 },
  cardLabel: {
    fontSize: 11,
    marginTop: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "rgba(11,17,40,0.66)",
  },
  lockBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,17,40,0.75)",
  },
  selectedBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
