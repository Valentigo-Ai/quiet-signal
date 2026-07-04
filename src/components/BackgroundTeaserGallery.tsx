import React from "react";
import { View, Text, Image, Pressable, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { usePro } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import {
  BACKGROUND_IMAGES,
  DEFAULT_BACKGROUNDS,
  BackgroundImageId,
  BackgroundScreenKey,
} from "@/constants/backgroundLibrary";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { spacing, fontSizes, radii, fonts } from "@/lib/theme";

const ALL_IDS = Object.keys(BACKGROUND_IMAGES) as BackgroundImageId[];
const THUMB_WIDTH = 70;
const THUMB_GAP = spacing.sm;
const ITEM_STRIDE = THUMB_WIDTH + THUMB_GAP;

// Home-screen Pro upsell (Section: Pro tier). Previously the full 63-photo
// library only existed behind Settings > Backgrounds, and free users hit a
// locked "Pro" button there without ever seeing what they'd actually be
// unlocking - a text-only upsell most people scroll past. This puts the
// whole library, thumbnails and all, right on the daily check-in screen -
// every photo visible, a lock badge on anything free doesn't include -
// which is a much stronger "window shopping" upsell than a sentence.
//
// Sits below the "Log today" action in CheckInScreen, not above it or in
// place of it: the daily check-in itself has to stay the fast, uncluttered
// thing it's designed to be (Section 4.2, under-15-seconds target) - this
// is something to browse after, not a gate in front of it.
//
// Uses FlatList (not ScrollView) deliberately - BackgroundsScreen already
// hit a real bug from mounting many full-res photos at once (Android's
// Fresco image pipeline blowing its concurrent-decode budget, photos
// rendering blank with no error). FlatList only mounts a small window of
// items regardless of how many of the 63 exist, which avoids that failure
// mode here without needing to cut the library down.
export function BackgroundTeaserGallery({ screenKey }: { screenKey: BackgroundScreenKey }) {
  const { theme } = useAppTheme();
  const { isPro } = usePro();
  const { prefs, setBackground } = useBackgroundPrefs();
  const navigation = useNavigation<any>();
  const currentId = prefs[screenKey];

  const handlePress = (id: BackgroundImageId) => {
    const locked = !isPro && id !== DEFAULT_BACKGROUNDS[screenKey];
    if (locked) {
      navigation.navigate("Upgrade");
      return;
    }
    // Free users can only ever "select" their existing default here (the
    // context's own setBackground already enforces this too - see
    // BackgroundPrefsContext) - Pro users get an instant live preview,
    // since this changes the exact background the strip is sitting on.
    setBackground(screenKey, id);
  };

  return (
    <View style={{ marginTop: spacing.xl }}>
      <TextOnPhoto style={styles.headerPill}>
        <Text style={{ color: theme.text, fontFamily: fonts.bodyBold }}>Backgrounds</Text>
        <Text style={{ color: theme.textMuted, fontSize: fontSizes.label, marginTop: 2 }}>
          {isPro ? "Tap a photo to use it here" : "Free includes one look - Pro unlocks the whole library"}
        </Text>
      </TextOnPhoto>
      <FlatList
        data={ALL_IDS}
        keyExtractor={(id) => id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: THUMB_GAP, paddingRight: spacing.lg }}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(_, index) => ({ length: ITEM_STRIDE, offset: ITEM_STRIDE * index, index })}
        renderItem={({ item: id }) => {
          const locked = !isPro && id !== DEFAULT_BACKGROUNDS[screenKey];
          const selected = id === currentId;
          return (
            <Pressable onPress={() => handlePress(id)} style={styles.thumbWrap} accessibilityRole="button">
              <Image
                source={BACKGROUND_IMAGES[id].source}
                style={[styles.thumb, { borderColor: selected ? theme.primary : "transparent" }]}
              />
              {locked && (
                <View style={[styles.lockBadge, { backgroundColor: theme.text + "CC" }]}>
                  <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerPill: { alignSelf: "flex-start", marginBottom: spacing.sm },
  thumbWrap: { position: "relative" },
  thumb: { width: THUMB_WIDTH, height: 95, borderRadius: radii.sm, borderWidth: 2 },
  lockBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
