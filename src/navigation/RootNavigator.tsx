import React from "react";
import { NavigationContainer } from "@react-navigation/native";
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
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="WhatAreYouDealingWith" component={WhatAreYouDealingWithScreen} />
      <OnboardingStack.Screen name="Consent" component={ConsentScreen} />
      <OnboardingStack.Screen name="SignUp" component={SignUpScreen} />
      <OnboardingStack.Screen name="Login" component={LoginScreen} />
      <OnboardingStack.Screen name="AddFirstRecipient" component={AddFirstRecipientScreen} />
    </OnboardingStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator>
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
      <MainTabs.Screen name="Settings" component={SettingsNavigator} options={{ title: "Settings" }} />
    </MainTabs.Navigator>
  );
}

export function RootNavigator() {
  const { session, loading, needsConsent } = useAuth();

  if (loading) return null; // could add a calm splash/loading state here

  // A session with needsConsent=true means someone signed in (most likely
  // via Google - Section 4.1) without ever going through the health-data
  // consent / age-gate screens that the email sign-up flow enforces. Route
  // them straight into that flow, skipping Welcome/SignUp since they're
  // already authenticated, before letting them anywhere near the main app.
  const showOnboarding = !session || needsConsent;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
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
              options={{ headerShown: true, title: "Share" }}
            />
            <RootStack.Screen
              name="Upgrade"
              component={UpgradeScreen}
              options={{ headerShown: true, title: "Quiet Signal Pro", presentation: "modal" }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
