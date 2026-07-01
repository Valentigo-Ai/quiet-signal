// Calm, warm, non-clinical design tokens (Section 8). Dark mode is a
// first-class option, not an afterthought - both palettes defined together.
// Large touch targets and generous spacing throughout, since chronic pain
// and fatigue can affect fine motor control (Section 8 accessibility note).

export const lightTheme = {
  mode: "light" as const,
  background: "#F6F1EB", // warm off-white, not clinical white
  surface: "#FFFFFF",
  text: "#2B2622",
  textMuted: "#6B6259",
  primary: "#8A6552", // warm terracotta, not clinical blue/green
  primarySoft: "#EFE0D6",
  border: "#E3D8CC",
  danger: "#B3413A",
  success: "#5C7A5A",
  minTouchTarget: 48,
};

export const darkTheme = {
  mode: "dark" as const,
  background: "#1E1A17",
  surface: "#2A2420",
  text: "#F1EAE3",
  textMuted: "#C9BEB3",
  primary: "#D8A588",
  primarySoft: "#3A2E27",
  border: "#3E332B",
  danger: "#E08079",
  success: "#8FB78C",
  minTouchTarget: 48,
};

export type Theme = typeof lightTheme;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const fontSizes = { body: 17, label: 15, title: 22, largeTitle: 28 };
export const highContrastMultiplier = 1.0; // toggled via ThemeContext when high-contrast is on
