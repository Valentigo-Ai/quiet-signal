import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, fontSizes } from "@/lib/theme";

// Warm, non-clinical 3-card welcome carousel (Section 4.1 / 5 Flow A).
// No lengthy assessment - just plain language about what the app does.
const CARDS = [
  {
    title: "A quiet way to say how you're doing",
    body:
      "Quiet Signal helps you log a quick daily check-in and share a simple, honest status with someone you trust - without having to find the words out loud.",
  },
  {
    title: "Just for you, or shared - your call",
    body:
      "Every check-in is private by default. You choose, each time, whether to share it, and who with. Nothing is ever shared automatically.",
  },
  {
    title: "Not a diagnosis, not a crisis tool",
    body:
      "This app doesn't diagnose or treat anything - it's just a way to log how you're feeling and let someone know. Crisis support is always one tap away if you ever need it.",
  },
];

export function WelcomeScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const [index, setIndex] = useState(0);
  const card = CARDS[index];
  const isLast = index === CARDS.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{card.title}</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>{card.body}</Text>
      </View>
      <View style={styles.dots}>
        {CARDS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === index ? theme.primary : theme.border },
            ]}
          />
        ))}
      </View>
      <PrimaryButton
        label={isLast ? "Get started" : "Continue"}
        onPress={() =>
          isLast ? navigation.navigate("WhatAreYouDealingWith") : setIndex((i) => i + 1)
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "space-between" },
  content: { flex: 1, justifyContent: "center" },
  title: { fontSize: fontSizes.largeTitle, fontWeight: "700", marginBottom: spacing.md },
  body: { fontSize: fontSizes.body, lineHeight: 26 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
