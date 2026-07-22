import { useEffect, useState } from "react";
import { useFonts, Fraunces_400Regular, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Karla_400Regular, Karla_700Bold } from "@expo-google-fonts/karla";

// Loads the brand typefaces (see fonts.heading / fonts.body in lib/theme.ts).
// Richard: this needs the packages installed before it'll build - run:
//   npx expo install @expo-google-fonts/fraunces @expo-google-fonts/karla expo-font expo-splash-screen
//
// Cold-start white-screen fix (2026-07-22): useFonts() returns a
// [loaded, error] tuple. This previously discarded `error`, so if font
// loading ever failed - more likely right after a cold start under memory
// pressure, e.g. the process being freshly relaunched after Android killed
// it overnight - `loaded` stayed false forever. App.tsx gates its entire
// render on this value (`if (!fontsLoaded) return null`), and that check
// happens before ErrorBoundary is even mounted, so a stuck font load was an
// unrecoverable blank screen with nothing to catch it - only a force-quit
// (which gave the next launch different memory/timing conditions) "fixed"
// it. Now: an explicit load error, or a 4s timeout if neither loaded nor
// error ever fires, both let the app proceed anyway (falling back to the
// system font rather than hanging indefinitely).
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Karla_400Regular,
    Karla_700Bold,
  });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (error) {
      console.warn("[Fonts] brand font load failed, falling back to system font:", error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) return;
    const timer = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, [loaded, error]);

  return loaded || !!error || timedOut;
}
