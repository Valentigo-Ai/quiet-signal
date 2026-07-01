import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, fontSizes } from "@/lib/theme";

// Email/password login. Google sign-in (Section 4.1) should be wired up via
// supabase.auth.signInWithOAuth({ provider: 'google' }) once a Google OAuth
// client is configured in the Supabase Auth dashboard - left as a follow-up
// since it requires console credentials outside this build.
export function LoginScreen() {
  const { theme } = useAppTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Welcome back</Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      <PrimaryButton label="Log in" onPress={handleLogin} loading={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  title: { fontSize: fontSizes.title, fontWeight: "700", marginBottom: spacing.lg },
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, fontSize: fontSizes.body },
});
