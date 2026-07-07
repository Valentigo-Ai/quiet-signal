import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  highContrast: boolean;
  toggleDark: () => void;
  toggleHighContrast: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<"light" | "dark" | null>(null);
  const [highContrast, setHighContrast] = useState(false);

  // Midnight is the flagship brand look (matches the website's rebrand), so
  // the app opens dark by default - like Calm - rather than following the
  // system scheme. The in-app toggle (Settings) still lets anyone switch to
  // the soft lavender light mode; that explicit choice always wins.
  // systemScheme is intentionally unused for the default but kept so a
  // future "follow system" setting is a one-line change.
  void systemScheme;
  const isDark = (override ?? "dark") === "dark";
  const baseTheme = isDark ? darkTheme : lightTheme;

  const theme = useMemo(() => {
    if (!highContrast) return baseTheme;
    // High-contrast mode: push text/background further apart. Kept simple
    // and rule-based, no external dependency (Section 8 accessibility note).
    //
    // surface also needs its own override here, not just text/background/
    // border: every card and row in the app is built from
    // `theme.surface + "E6"` (etc.) - a translucent tint meant to blend over
    // a background photo. ScreenBackground already drops the photo entirely
    // in high-contrast mode (falls back to a plain `background` color), so
    // without a genuinely distinct surface color, that same translucent card
    // tint just blends into the solid background instead of a photo -
    // reading as an undifferentiated black (or white) screen, which is the
    // opposite of what high contrast is supposed to achieve. Chosen values
    // are deliberately far from background/text, not a subtle shift.
    return {
      ...baseTheme,
      text: isDark ? "#FFFFFF" : "#000000",
      background: isDark ? "#000000" : "#FFFFFF",
      surface: isDark ? "#333333" : "#E0E0E0",
      border: isDark ? "#FFFFFF" : "#000000",
    };
  }, [baseTheme, highContrast, isDark]);

  const value: ThemeContextValue = {
    theme,
    isDark,
    highContrast,
    toggleDark: () => setOverride(isDark ? "light" : "dark"),
    toggleHighContrast: () => setHighContrast((v) => !v),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}
