import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSizes } from "@/lib/theme";

// 0-4 tap-scale, plain-language labels rather than raw numbers (Section 4.2).
// Large touch targets throughout for accessibility.

type Props = {
  label: string;
  value: number; // 0-4
  onChange: (value: number) => void;
  scaleLabels: [string, string, string, string, string];
};

export function ScaleInput({ label, value, onChange, scaleLabels }: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
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
                  { color: selected ? "#FFFFFF" : theme.text },
                ]}
                numberOfLines={2}
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
  label: { fontSize: fontSizes.title, fontWeight: "600", marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.xs },
  pill: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  pillText: { fontSize: 12, textAlign: "center", fontWeight: "500" },
});
