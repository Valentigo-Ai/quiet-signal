import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSizes, fonts } from "@/lib/theme";
import { TextOnPhoto } from "./TextOnPhoto";

// 0-4 tap-scale, plain-language labels rather than raw numbers (Section 4.2).
// Large touch targets throughout for accessibility. value is nullable so the
// scale can start with nothing chosen each day (no pill pre-highlighted)
// rather than defaulting to whichever index the screen happened to pick.

type Props = {
  label: string;
  value: number | null; // 0-4, or null if nothing chosen yet
  onChange: (value: number) => void;
  scaleLabels: [string, string, string, string, string];
};

export function ScaleInput({ label, value, onChange, scaleLabels }: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <TextOnPhoto style={{ marginBottom: spacing.sm }}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      </TextOnPhoto>
      <View style={styles.row}>
        {scaleLabels.map((text, i) => {
          const selected = value === i;
          return (
            <Pressable
              key={i}
              onPress={() => onChange(i)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${text}`}
              style={[
                styles.pill,
                {
                  backgroundColor: selected ? theme.primary : theme.primarySoft,
                  minHeight: theme.minTouchTarget,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: selected ? theme.onPrimary : theme.text },
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  row: { flexDirection: "row", gap: spacing.xs },
  pill: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  pillText: { fontSize: 12, textAlign: "center", fontFamily: fonts.body },
});
