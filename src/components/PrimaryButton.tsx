import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, AccessibilityRole } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSizes, raisedShadow, fonts } from "@/lib/theme";

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
  const fg =
    variant === "secondary" ? theme.text : variant === "danger" ? theme.onDanger : theme.onPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole={"button" as AccessibilityRole}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && !disabled ? raisedShadow : null,
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
    fontFamily: fonts.bodyBold,
  },
});
