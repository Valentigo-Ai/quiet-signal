import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, fontSizes, imageTextShadow, fonts } from "@/lib/theme";

// Email/password login, plus Google sign-in (Section 4.1) as an easier
// alternative. Google needs a one-time OAuth client set up in the Supabase
// Auth dashboard (Authentication > Providers > Google) before it'll work -
// see AuthContext.tsx / project notes for the exact steps.
export function LoginScreen() {
  const { theme } = useAppTheme();
  const { signIn, signInWithGoogle } = useAuth();
  const { getSource } = useBackgroundPrefs();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      Alert.alert("Login failed", e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      Alert.alert("Google sign-in failed", e.message ?? String(e));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <ScreenBackground source={getSource("login")}>
      <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }, imageTextShadow]}>Welcome back</Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface + "F0" }]}
      />
      <View style={[styles.passwordRow, { borderColor: theme.border, backgroundColor: theme.surface + "F0" }]}>
        <TextInput
          placeholder="Password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={[styles.passwordInput, { color: theme.text }]}
        />
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          style={styles.eyeButton}
        >
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color={theme.textMuted} />
        </Pressable>
      </View>
      <PrimaryButton label="Log in" onPress={handleLogin} loading={loading} disabled={googleLoading} />

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerLabel, { color: theme.textMuted }, imageTextShadow]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>

      <Pressable
        onPress={handleGoogleLogin}
        disabled={loading || googleLoading}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        style={[
          styles.googleButton,
          { borderColor: theme.border, backgroundColor: theme.surface, minHeight: theme.minTouchTarget, opacity: googleLoading ? 0.6 : 1 },
        ]}
      >
        <Ionicons name="logo-google" size={20} color={theme.text} />
        <Text style={[styles.googleButtonLabel, { color: theme.text }]}>
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </Text>
      </Pressable>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, fontSize: fontSizes.body },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { marginHorizontal: spacing.sm, fontSize: fontSizes.label },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.md,
  },
  googleButtonLabel: { fontSize: fontSizes.body, fontWeight: "600" },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: spacing.md,
    paddingLeft: spacing.md,
  },
  passwordInput: { flex: 1, paddingVertical: spacing.md, fontSize: fontSizes.body },
  eyeButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
});
