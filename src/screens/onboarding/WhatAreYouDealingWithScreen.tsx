import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, fontSizes, fonts } from "@/lib/theme";
import { PRESENTING_CONCERN_OPTIONS, PRESENTING_CONCERNS_BLURB } from "@/constants/presentingConcerns";

// "What are you dealing with?" - Section 4.1. Optional, skippable,
// multi-select. Gates which optional check-in blocks appear (Anxiety,
// PTSD - see CheckInScreen.tsx) and lightly tailors in-app language; never
// shown to recipients. The options themselves now live in
// @/constants/presentingConcerns because Settings -> "What you're tracking"
// (WhatYoureTrackingScreen) offers the exact same choices for editing later,
// and the two lists drifting apart would be a silent, confusing bug.

export function WhatAreYouDealingWithScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<string[]>([]);
  const [other, setOther] = useState("");

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const goNext = () => {
    navigation.navigate("Consent", { presentingConcerns: selected, presentingConcernsOther: other });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>What are you dealing with?</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>{PRESENTING_CONCERNS_BLURB}</Text>
      {/* Says up front that this isn't a one-shot decision. People answering
          this question are often unsure whether something "counts" as
          applying to them, and knowing it's reversible makes it much easier
          to tick a box now rather than freeze on it. */}
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        You can change this any time in Settings.
      </Text>

      {PRESENTING_CONCERN_OPTIONS.map((opt) => {
        const isSelected = selected.includes(opt.key);
        return (
          <Pressable
            key={opt.key}
            onPress={() => toggle(opt.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            style={[
              styles.option,
              {
                backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                borderColor: theme.border,
                minHeight: theme.minTouchTarget,
              },
            ]}
          >
            <Text style={{ color: theme.text, fontSize: fontSizes.body }}>{opt.label}</Text>
          </Pressable>
        );
      })}

      <TextInput
        placeholder="Something else (optional)"
        placeholderTextColor={theme.textMuted}
        value={other}
        onChangeText={setOther}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />

      <View style={{ flex: 1 }} />
      <PrimaryButton label="Continue" onPress={goNext} />
      <Pressable onPress={goNext} style={{ marginTop: spacing.sm, alignItems: "center" }}>
        <Text style={{ color: theme.textMuted }}>Skip for now</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSizes.label, marginBottom: spacing.lg },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    fontSize: fontSizes.body,
  },
});
