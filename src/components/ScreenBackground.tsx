import React from "react";
import { ImageBackground, View, StyleSheet, ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";

// Calm, warm background photography. Text either has its own opaque card
// (crisis resource cards, journal entries, list rows, text inputs) or a
// text-shadow "halo" (see theme.imageTextShadow) - both are WCAG-recognised
// alternatives to a full-screen scrim (W3C 1.4.3 technique G18).
//
// In practice, on busy/high-detail photos (forests, water with lots of
// texture) the text-shadow-only approach wasn't holding up - real device
// screenshots showed title text and un-carded labels becoming hard to read
// against some background photos. Rather than dropping the photos or
// covering them entirely, this now runs a soft, low-opacity gradient scrim
// across the *whole* image (not just a top header band): strongest at the
// top where titles usually sit, but never fully transparent even at the
// bottom, so any text placed lower on a screen still gets a contrast floor.
// The photo is still clearly visible through it - this is a dimmer, not a
// blackout - but it gives every screen a baseline of legibility instead of
// relying solely on where a designer remembered to add a card or a shadow.
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
      <LinearGradient
        pointerEvents="none"
        colors={[theme.background + "E6", theme.background + "99", theme.background + "4D"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea} edges={edges}>
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  image: { flex: 1 },
  safeArea: { flex: 1 },
});
