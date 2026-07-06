// Calm, warm, non-clinical design tokens (Section 8). Dark mode is a
// first-class option, not an afterthought - both palettes defined together.
// Large touch targets and generous spacing throughout, since chronic pain
// and fatigue can affect fine motor control (Section 8 accessibility note).

// "Midnight Signal" palette - matches the website's rebrand (deep indigo
// night-sky world, lavender mist text, one warm golden accent). Dark mode is
// the flagship look; light mode is a soft lavender paper, never stark white.
export const lightTheme = {
  mode: "light" as const,
  background: "#EDF0FA", // lavender paper, not stark white
  surface: "#F8F9FE",
  text: "#1C2240",
  textMuted: "#545D8A",
  primary: "#3E4C8F", // deep indigo
  onPrimary: "#FFFFFF",
  primarySoft: "#DDE3F8",
  border: "#CDD4EE",
  danger: "#B3413A",
  onDanger: "#FFFFFF",
  success: "#2F6B55",
  minTouchTarget: 48,
};

export const darkTheme = {
  mode: "dark" as const,
  background: "#0B1128", // midnight
  surface: "#151D3E",
  text: "#EEF1FC",
  textMuted: "#A9B4DC",
  primary: "#F3C77C", // warm gold - the one accent in the night sky
  onPrimary: "#3B2508",
  primarySoft: "#26305C",
  border: "#2C3560",
  danger: "#E08079",
  onDanger: "#2B0F0C",
  success: "#7FC7AE",
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

// For text sitting directly over a background photo (see ScreenBackground -
// which deliberately does NOT dim the photo itself anymore, so photos stay
// fully clear). Prefer wrapping text in TextOnPhoto (an opaque card) over
// relying on this shadow alone - it's a reasonable fallback for very short,
// low-stakes labels, but real-device screenshots have shown shadow-only text
// becoming hard to read against busy/high-detail photos. A "halo" like this
// is one of WCAG's own recognised alternatives to a background scrim (W3C
// 1.4.3, technique G18), which is why it's stronger than a typical
// decorative shadow - but it's not as reliable as an opaque card.
export const imageTextShadow = {
  textShadowColor: "rgba(0,0,0,0.65)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 10,
};
