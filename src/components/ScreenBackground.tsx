import React from "react";
import { ImageBackground, View, StyleSheet, ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";

// Calm, warm background photography, shown at full clarity - no tint over
// the photo itself. The only thing dimmed is a short gradient behind the
// header/title zone at the top, which is the one place text sits directly
// on the raw image; everywhere else, text either has its own opaque card
// (crisis resource cards, journal entries, list rows, text inputs) or a
// text-shadow "halo" (see theme.imageTextShadow) - both are WCAG-recognised
// alternatives to a full-screen scrim (W3C 1.4.3 technique G18). High
// contrast mode skips the photo entirely and falls back to a plain solid
// background, per the app's accessibility commitment.
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
      <LinearGradient
        pointerEvents="none"
        colors={[theme.background + "D9", theme.background + "00"]}
        locations={[0, 1]}
        style={styles.headerFade}
      />
      <SafeAreaView style={styles.safeArea} edges={edges}>
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  image: { flex: 1 },
  headerFade: { position: "absolute", top: 0, left: 0, right: 0, height: 240 },
  safeArea: { flex: 1 },
});
