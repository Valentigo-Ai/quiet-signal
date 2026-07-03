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

export type Theme = typeof lightTheme | typeof darkTheme;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const fontSizes = { body: 17, label: 15, title: 22, largeTitle: 28 };
export const highContrastMultiplier = 1.0; // toggled via ThemeContext when high-contrast is on

// Brand typefaces (Fraunces + Karla via @expo-google-fonts - loaded in
// App.tsx through useAppFonts()). Fraunces is the warm editorial serif for
// headlines/titles - it's what makes the app read as a considered, personal
// product rather than a generic system-font utility screen. Karla carries
// everything else: buttons, body copy, labels. Falls back to the platform
// system font automatically if a screen is rendered before fonts finish
// loading (App.tsx gates first paint on this, so in practice this shouldn't
// happen, but StyleSheet.create can't guarantee load order across fast
// refresh in dev).
export const fonts = {
  heading: "Fraunces_600SemiBold",
  headingRegular: "Fraunces_400Regular",
  body: "Karla_400Regular",
  bodyBold: "Karla_700Bold",
};

// Shared elevation tokens for the visual-polish pass (card shadows etc).
// Deliberately subtle - this app avoids anything flashy/gamified.
export const radii = { sm: 10, md: 14, lg: 20 };
export const cardShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 2,
};
export const raisedShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.12,
  shadowRadius: 14,
  elevation: 4,
};

// For text sitting directly over a background photo (see ScreenBackground).
// ScreenBackground now also applies a soft full-image gradient scrim, so
// this shadow is a second layer of insurance rather than the only thing
// standing between text and a busy photo. Strengthened slightly (opacity
// and radius both up) after real-device screenshots showed the previous
// values weren't reliably enough on high-detail images - a "halo" around
// the text is one of WCAG's own recognised alternatives to a background
// scrim (W3C 1.4.3, technique G18), which is why it's stronger than a
// typical decorative shadow.
export const imageTextShadow = {
  textShadowColor: "rgba(0,0,0,0.65)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 10,
};
