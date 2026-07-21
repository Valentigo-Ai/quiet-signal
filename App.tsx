import "react-native-url-polyfill/auto";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { CrisisCountryProvider } from "@/context/CrisisCountryContext";
import { ProProvider } from "@/context/ProContext";
import { BackgroundPrefsProvider } from "@/context/BackgroundPrefsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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

  // Android-only: with edge-to-edge now mandatory on Android (Expo SDK 54 /
  // Android 15+), the system navigation bar is transparent by default, and
  // its button icons need an explicit style or they render dark-on-dark (or
  // default light chrome) instead of matching the midnight theme - this,
  // plus the same gap for the status bar, was the likely source of the
  // white bars framing every screen on the native app. app.json's
  // expo-navigation-bar plugin sets this at build time; this call covers
  // it at runtime too, in case a bare/dev-client build predates the plugin.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    // setStyle is synchronous (no "Async" suffix, returns void, not a
    // Promise) - the wrong name (setStyleAsync) crashed at runtime.
    try {
      NavigationBar.setStyle("light");
    } catch {
      // no-op - shouldn't happen, but this must never crash app startup
    }
  }, []);

  // Web-only layout fix: outside of Expo Router (which ships its own HTML
  // template with this built in), the browser's html/body/#root elements
  // have no defined height or width, so React Native Web's flex:1 screens
  // just shrink-wrap to their content instead of filling the browser
  // window - the "narrow column on the left" look this was producing.
  // Injected via plain DOM APIs, guarded by Platform.OS, so it's a no-op
  // (and never even runs) on native.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.textContent = `
      html, body, #root { height: 100%; width: 100%; margin: 0; padding: 0; }
      #root { display: flex; flex: 1; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    // KeyboardProvider (react-native-keyboard-controller) has to wrap
    // everything that uses KeyboardAwareScrollView (CheckInScreen,
    // JournalScreen). This replaces the earlier Keyboard.addListener-based
    // height tracking, which turned out to depend on the window actually
    // resizing when the keyboard opens - on this app's Android SDK 36 /
    // edge-to-edge target, adjustResize behaves like adjustNothing (Android
    // just hands over IME insets instead of resizing anything), so that
    // event never reliably fired and the keyboard kept covering the input on
    // real devices. This library reads the native IME inset/animation
    // directly instead of depending on a window resize, so it isn't
    // affected by that edge-to-edge behavior change.
    <KeyboardProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <ProProvider>
            <BackgroundPrefsProvider>
              <CrisisCountryProvider>
                <AuthProvider>
                  {/* translucent + transparent background so the full-screen photo behind
                      each screen renders all the way to the top edge on Android instead
                      of sitting under an opaque status bar strip (iOS is already
                      translucent-over-content by default). */}
                  <StatusBar style="auto" translucent backgroundColor="transparent" />
                  <RootNavigator />
                </AuthProvider>
              </CrisisCountryProvider>
            </BackgroundPrefsProvider>
          </ProProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </KeyboardProvider>
  );
}
