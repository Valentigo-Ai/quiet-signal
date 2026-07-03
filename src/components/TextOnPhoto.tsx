import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { radii } from "@/lib/theme";

// Solid backing for text that sits directly on a background photo (titles,
// section headers, disclaimers, footers) rather than inside its own card,
// input, or row. Text-shadow alone (theme.imageTextShadow) isn't reliable
// contrast against busy or Pro-selectable photos - see the Sign Up / Login
// title legibility fix this mirrors. Defaults to hugging its content
// (alignSelf: "flex-start"); pass style={{ alignSelf: "center" }} etc. for
// centered or full-width text like footers.
export function TextOnPhoto({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useAppTheme();
  return <View style={[styles.pill, { backgroundColor: theme.surface + "F0" }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 4 },
});
