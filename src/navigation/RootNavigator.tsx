import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";

import { WelcomeScreen } from "@/screens/onboarding/WelcomeScreen";
import { WhatAreYouDealingWithScreen } from "@/screens/onboarding/WhatAreYouDealingWithScreen";
import { ConsentScreen } from "@/screens/onboarding/ConsentScreen";
import { SignUpScreen } from "@/screens/onboarding/SignUpScreen";
import { LoginScreen } from "@/screens/onboarding/LoginScreen";
import { ForgotPasswordScreen } from "@/screens/onboarding/ForgotPasswordScreen";
import { ResetPasswordScreen } from "@/screens/onboarding/ResetPasswordScreen";
import { AddFirstRecipientScreen } from "@/screens/onboarding/AddFirstRecipientScreen";

import { CheckInScreen } from "@/screens/home/CheckInScreen";
import { ShareFlowScreen } from "@/screens/home/ShareFlowScreen";
import { HistoryScreen } from "@/screens/history/HistoryScreen";
import { JournalScreen } from "@/screens/journal/JournalScreen";
import { CrisisResourcesScreen } from "@/screens/crisis/CrisisResourcesScreen";
import { SettingsScreen } from "@/screens/settings/SettingsScreen";
import { RecipientsScreen } from "@/screens/settings/RecipientsScreen";
import { PrivacyNoticeScreen } from "@/screens/settings/PrivacyNoticeScreen";
import { DataExportScreen } from "@/screens/settings/DataExportScreen";
import { DeleteAccountScreen } from "@/screens/settings/DeleteAccountScreen";
import { BackgroundsScreen } from "@/screens/settings/BackgroundsScreen";
import { UpgradeScreen } from "@/screens/pro/UpgradeScreen";

const OnboardingStack = createNativeStackNavigator();
const MainTabs = createBottomTabNavigator();
const SettingsStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Maps each main tab route to an Ionicons name (outline when inactive, filled
// when focused). tabBarIcon was never set here before, which is why the tab
// bar showed React Navigation's built-in "missing icon" placeholder box on
// every tab instead of a real icon.
const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  CheckIn: { active: "today", inactive: "today-outline" },
  History: { active: "stats-chart", inactive: "stats-chart-outline" },
  Journal: { active: "book", inactive: "book-outline" },
  CrisisResources: { active: "heart", inactive: "heart-outline" },
  Settings: { active: "settings", inactive: "settings-outline" },
};

function OnboardingNavigator({ initialRouteName }: { initialRouteName?: string }) {
  const { theme } = useAppTheme();

  return (
    <OnboardingStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}
      initialRouteName={initialRouteName}
    >
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="WhatAreYouDealingWith" component={WhatAreYouDealingWithScreen} />
      <OnboardingStack.Screen name="Consent" component={ConsentScreen} />
      <OnboardingStack.Screen name="SignUp" component={SignUpScreen} />
      <OnboardingStack.Screen name="Login" component={LoginScreen} />
      <OnboardingStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <OnboardingStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <OnboardingStack.Screen name="AddFirstRecipient" component={AddFirstRecipientScreen} />
    </OnboardingStack.Navigator>
  );
}

function SettingsNavigator() {
  const { theme } = useAppTheme();

  return (
    <SettingsStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        // These screens keep their header (headerShown defaults to true on
        // native-stack), and a header is real UI, not "content" - contentStyle
        // above doesn't touch it. Left unstyled, native-stack's own default is
        // a plain white bar with black text, which is the other place the
        // rebrand was still showing through as white.
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
      }}
    >
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: "Settings" }} />
      <SettingsStack.Screen name="Recipients" component={RecipientsScreen} options={{ title: "Shared with" }} />
      <SettingsStack.Screen name="Backgrounds" component={BackgroundsScreen} options={{ title: "Backgrounds" }} />
      <SettingsStack.Screen name="PrivacyNotice" component={PrivacyNoticeScreen} options={{ title: "Privacy Notice" }} />
      <SettingsStack.Screen name="DataExport" component={DataExportScreen} options={{ title: "Export my data" }} />
      <SettingsStack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: "Delete account" }} />
    </SettingsStack.Navigator>
  );
}

function MainNavigator() {
  const { theme } = useAppTheme();

  return (
    <MainTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
        },
        // Floating, semi-opaque tab bar (React Navigation's own recommended
        // pattern for a full-bleed image behind the tab bar: absolute
        // position + a translucent tabBarStyle background, rather than a
        // solid docked bar) so each screen's photo runs the full height of
        // the device edge-to-edge instead of stopping above a solid strip.
        // Screens add bottom padding via useBottomTabBarHeight() so content
        // doesn't sit underneath it.
        tabBarStyle: {
          position: "absolute",
          backgroundColor: theme.surface + "F0",
          borderTopWidth: 0,
          elevation: 0,
        },
        sceneContainerStyle: { backgroundColor: theme.background },
      })}
    >
      <MainTabs.Screen name="CheckIn" component={CheckInScreen} options={{ title: "Today" }} />
      <MainTabs.Screen name="History" component={HistoryScreen} options={{ title: "History" }} />
      <MainTabs.Screen name="Journal" component={JournalScreen} options={{ title: "Journal" }} />
      <MainTabs.Screen
        name="CrisisResources"
        component={CrisisResourcesScreen}
        options={{ title: "Support" }}
      />
      <MainTabs.Screen
        name="Settings"
        component={SettingsNavigator}
        // Bug fix: nested stacks keep their last-visited screen by default,
        // so once someone opened e.g. "Shared with" and switched tabs, the
        // Settings tab would reopen straight into that screen forever - no
        // way back to the actual Settings menu except a full app restart.
        // unmountOnBlur resets this stack to SettingsHome every time the
        // tab loses focus, so tapping "Settings" always shows the menu.
        options={{ title: "Settings", unmountOnBlur: true }}
      />
    </MainTabs.Navigator>
  );
}

export function RootNavigator() {
  const { session, loading, needsConsent } = useAuth();
  const { theme } = useAppTheme();

  // React Navigation's DefaultTheme background is white - override it with
  // the app's midnight background so any frame the navigator paints before
  // a screen's own content (or its background photo) arrives is navy, not a
  // white flash.
  const navTheme = React.useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: theme.background,
        card: theme.surface,
      },
    }),
    [theme]
  );

  // While auth restores the session the splash screen is still up (App.tsx
  // no longer hides it early), so returning null here is invisible - the
  // splash covers it, then onReady below drops it once real UI has mounted.
  if (loading) return null;

  // A session with needsConsent=true means someone signed in (most likely
  // via Google - Section 4.1) without ever going through the health-data
  // consent / age-gate screens that the email sign-up flow enforces. Route
  // them straight into that flow, skipping Welcome/SignUp since they're
  // already authenticated, before letting them anywhere near the main app.
  const showOnboarding = !session || needsConsent;

  return (
    <NavigationContainer
      theme={navTheme}
      // The real end of "app is starting up": navigation has mounted and the
      // first screen exists. Hiding the splash here (instead of on font load
      // in App.tsx) is what removes the white gap between splash and first
      // screen on cold start.
      onReady={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      {/* contentStyle here (and on the nested navigators below) is the
          belt-and-braces fix for the white-flash bug: react-navigation's
          own screen containers have no background color by default, so any
          gap - before a screen's photo loads, or on web where the browser's
          default is white - showed through as white instead of the brand's
          midnight background. */}
      <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        {showOnboarding ? (
          <RootStack.Screen name="Onboarding">
            {() => <OnboardingNavigator initialRouteName={session ? "WhatAreYouDealingWith" : "Welcome"} />}
          </RootStack.Screen>
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainNavigator} />
            <RootStack.Screen
              name="ShareFlow"
              component={ShareFlowScreen}
              options={{
                headerShown: true,
                title: "Share",
                // Same header-theming fix as SettingsNavigator - these two
                // screens turn the header back on, so they need their own
                // colours instead of native-stack's default white bar.
                headerStyle: { backgroundColor: theme.surface },
                headerTintColor: theme.text,
                headerTitleStyle: { color: theme.text },
                headerShadowVisible: false,
              }}
            />
            <RootStack.Screen
              name="Upgrade"
              component={UpgradeScreen}
              options={{
                headerShown: true,
                title: "Quiet Signal Pro",
                presentation: "modal",
                headerStyle: { backgroundColor: theme.surface },
                headerTintColor: theme.text,
                headerTitleStyle: { color: theme.text },
                headerShadowVisible: false,
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
