import "react-native-url-polyfill/auto";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RootNavigator } from "@/navigation/RootNavigator";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
