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

// Long single-word labels ("Overwhelmed", "Triggered") don't fit this pill's
// width at the base font size, and with no space to wrap at, Android breaks
// them mid-word. The previous fix used adjustsFontSizeToFit/minimumFontScale,
// which are iOS-only and silently no-ops on Android - that's why the shrink
// never took, and why it ended up worked around with a hardcoded "\n" split
// ("Ground\ned") that left an orphaned "ed" on its own line.
//
// Instead, shrink the font for long unbroken words so they stay on one line.
// Multi-word labels ("A little on alert") are left alone - they wrap at their
// spaces, which reads fine. Only rendering changes; the label text itself is
// untouched, since it's reused in the share summary, PDF export and history.
//
// Sizes revised 2026-07-27 after on-device QA of v38: the first pass was
// estimated from a screenshot rather than measured, and every threshold was
// one step too generous. "Grounded" (8) at 11px, "Overloaded" (10) and
// "Overwhelmed" (11) at 10px all still broke mid-word; only "Triggered" (9)
// fitted. Each bucket therefore drops a step, and the pill's horizontal
// padding is halved to give the longest words a little more room to land in
// (five pills share the screen width, so padding is worth ~2 characters).
function pillFontSize(text: string): number {
  if (text.includes(" ")) return 12;
  if (text.length >= 11) return 9; // Overwhelmed
  if (text.length >= 10) return 9.5; // Overloaded
  if (text.length >= 8) return 10; // Grounded, Triggered
  return 12;
}

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
                  {
                    color: selected ? theme.onPrimary : theme.text,
                    fontSize: pillFontSize(text),
                  },
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
  label: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  row: { flexDirection: "row", gap: spacing.xs },
  pill: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2, // see pillFontSize - buys ~2 characters of width
    paddingVertical: spacing.sm,
  },
  pillText: { fontSize: 12, textAlign: "center", fontFamily: fonts.body },
});
