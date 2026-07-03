import "react-native-url-polyfill/auto";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { CrisisCountryProvider } from "@/context/CrisisCountryContext";
import { ProProvider } from "@/context/ProContext";
import { BackgroundPrefsProvider } from "@/context/BackgroundPrefsContext";
import { RootNavigator } from "@/navigation/RootNavigator";
import { useAppFonts } from "@/lib/useAppFonts";

// Keep the splash screen up until the brand fonts (Fraunces/Karla) are
// loaded, so there's no flash of system-font text on first paint.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <ProProvider>
        <BackgroundPrefsProvider>
          <CrisisCountryProvider>
            <AuthProvider>
              <StatusBar style="auto" />
              <RootNavigator />
            </AuthProvider>
          </CrisisCountryProvider>
        </BackgroundPrefsProvider>
      </ProProvider>
    </ThemeProvider>
  );
}
