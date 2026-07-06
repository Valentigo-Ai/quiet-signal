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
    return {
      ...baseTheme,
      text: isDark ? "#FFFFFF" : "#000000",
      background: isDark ? "#000000" : "#FFFFFF",
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
