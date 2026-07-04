import React from "react";
import { ImageBackground, View, StyleSheet, ImageSourcePropType } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";

// Calm, warm background photography, shown fully clear - no dimming layer
// on top. Backgrounds are a Pro feature (Section: Pro tier), so muddying
// them with a grey scrim undercuts the very thing people are paying for.
//
// This previously ran a soft gradient dimmer across the whole image for
// text-legibility "insurance." That made every photo look washed out, which
// is worse than the readability problem it was solving. Legibility is now
// handled per-element instead: every piece of text that sits directly on a
// photo gets its own opaque card/pill (TextOnPhoto, list rows, inputs) - a
// WCAG-recognised alternative to a background scrim (W3C 1.4.3, technique
// G18) that doesn't require dimming the photo itself. If a new screen adds
// bare text straight onto a photo without one of those, that's the bug to
// fix, not a reason to bring back a global scrim.
// High contrast mode still skips the photo entirely and falls back to a
// plain solid background, per the app's accessibility commitment.
export function ScreenBackground({
  source,
  children,
  edges,
}: {
  source: ImageSourcePropType;
  children: React.ReactNode;
  edges?: Edge[];
}) {
  const { theme, highContrast } = useAppTheme();

  if (highContrast) {
    return (
      <View style={[styles.image, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea} edges={edges}>
          {children}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <ImageBackground source={source} style={styles.image} resizeMode="cover">
      <SafeAreaView style={styles.safeArea} edges={edges}>
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // width/height: "100%" alongside flex: 1 - on web, ImageBackground falls
  // back to the source image's own intrinsic pixel dimensions (e.g.
  // 1080x1920, a phone-photo crop) unless it's given an explicit percentage
  // size, since flex alone doesn't always propagate through its web
  // implementation the way it does natively. Without this, the whole app
  // renders squeezed into a narrow phone-sized column on desktop browsers
  // instead of filling the window.
  image: { flex: 1, width: "100%", height: "100%" },
  safeArea: { flex: 1 },
});
