import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "@/context/AuthContext";

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

const OnboardingStack = createNativeStackNavigator();
const MainTabs = createBottomTabNavigator();
const SettingsStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
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
      <SettingsStack.Screen name="PrivacyNotice" component={PrivacyNoticeScreen} options={{ title: "Privacy Notice" }} />
      <SettingsStack.Screen name="DataExport" component={DataExportScreen} options={{ title: "Export my data" }} />
      <SettingsStack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: "Delete account" }} />
    </SettingsStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainTabs.Navigator screenOptions={{ headerShown: false }}>
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
  const { session, loading } = useAuth();

  if (loading) return null; // could add a calm splash/loading state here

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <RootStack.Screen name="Main" component={MainNavigator} />
            <RootStack.Screen
              name="ShareFlow"
              component={ShareFlowScreen}
              options={{ headerShown: true, title: "Share" }}
            />
          </>
        ) : (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
