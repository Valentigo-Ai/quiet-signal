import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAppTheme } from "@/context/ThemeContext";

// Looping ambient video background - currently only used on the daily
// check-in screen (Richard's own footage, July 2026: a still lake with a
// willow reflection, graded with the same cool-blue recipe as the 63 photo
// backgrounds so it reads as part of the same "Midnight Signal" world, not a
// different treatment bolted on). Muted and silent by design - this screen
// is the app's anxiety-safe daily moment, and autoplaying sound on load
// would fight that, not support it (see CheckInScreen.tsx's own notes on why
// the photo picker was removed from here for the same underlying reason:
// nothing that demands attention belongs on this screen).
//
// Deliberately NOT wired into the Backgrounds picker/BackgroundPrefsContext
// system - this is a fixed, non-selectable ambient background, same as the
// decision to keep this screen free of choices. If that changes, this
// component would need a source prop and the picker would need a video-aware
// variant of BACKGROUND_IMAGES; not needed for the current single-video use.
const LAKE_LOOP = require("../../assets/video/checkin-lake-loop.mp4");

export function ScreenVideoBackground({
  children,
  edges,
}: {
  children: React.ReactNode;
  edges?: Edge[];
}) {
  const { theme, highContrast } = useAppTheme();

  const player = useVideoPlayer(LAKE_LOOP, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  if (highContrast) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea} edges={edges}>
          {children}
        </SafeAreaView>
      </View>
    );
  }

  // Web note: <video> is a CSS "replaced element" - position:absolute +
  // inset:0 (StyleSheet.absoluteFillObject) alone does NOT stretch it to
  // fill the parent the way it would a plain <div>, because replaced
  // elements size themselves from their own intrinsic dimensions when
  // width/height aren't explicitly set. Without the explicit 100%/100%
  // below, this silently rendered at the browser's default 300x150 video
  // box - present in the DOM and playing, just invisible at real size.
  // Native (iOS/Android) doesn't have this quirk, but the explicit size is
  // harmless there too.
  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <VideoView
        player={player}
        style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%" }]}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safeArea} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, width: "100%", height: "100%" },
  safeArea: { flex: 1 },
});
