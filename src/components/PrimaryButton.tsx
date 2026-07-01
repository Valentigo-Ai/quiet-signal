import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, AccessibilityRole } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSizes } from "@/lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  accessibilityHint,
}: Props) {
  const { theme } = useAppTheme();

  const bg =
    variant === "primary" ? theme.primary : variant === "danger" ? theme.danger : theme.primarySoft;
  const fg = variant === "secondary" ? theme.text : "#FFFFFF";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole={"button" as AccessibilityRole}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, minHeight: theme.minTouchTarget },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.label, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: fontSizes.body,
    fontWeight: "600",
  },
});
