import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const COLORS = ["#F3C77C", "#A7B4E8", "#7FC7AE", "#EEF1FC", "#8FA0D8", "#E8C98A"];
const PIECE_COUNT = 40;

type Piece = {
  id: number;
  left: number;
  width: number;
  height: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  rotateStart: number;
  rotateEnd: number;
};

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }).map((_, i) => {
    const rotateStart = Math.floor(Math.random() * 360);
    return {
      id: i,
      left: Math.random() * SCREEN_W,
      width: 5 + Math.random() * 5,
      height: 14 + Math.random() * 12,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 350,
      duration: 2200 + Math.random() * 1600,
      drift: (Math.random() - 0.5) * 140,
      rotateStart,
      rotateEnd: rotateStart + 360 + Math.random() * 360,
    };
  });
}

// Warm-toned falling streamers/confetti for the one moment in the app
// that's deliberately celebratory: finishing a Pro purchase. Everywhere
// else Quiet Signal stays calm and understated on purpose - this is the
// one intentional exception, because someone just paid for the app and
// that's worth a proper "thank you" rather than a plain system alert.
//
// Pure Animated + View, no extra native dependency - safe to ship in the
// same build as everything else, and nothing here touches native code
// autolinking could get wrong on a first real device build.
export function ConfettiBurst({ run }: { run: boolean }) {
  const pieces = useMemo(() => makePieces(), [run]);
  const progress = useRef(pieces.map(() => new Animated.Value(0)));

  useEffect(() => {
    if (!run) return;
    progress.current = pieces.map(() => new Animated.Value(0));
    const animations = pieces.map((p, i) =>
      Animated.timing(progress.current[i], {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    Animated.stagger(8, animations).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  if (!run) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {pieces.map((p, i) => {
        const anim = progress.current[i];
        const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-40, SCREEN_H + 40] });
        const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] });
        const rotate = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [`${p.rotateStart}deg`, `${p.rotateEnd}deg`],
        });
        const opacity = anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={p.id}
            style={{
              position: "absolute",
              left: p.left,
              top: 0,
              width: p.width,
              height: p.height,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
