import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, fontSizes, fonts } from "@/lib/theme";

// Email/password login, plus Google sign-in (Section 4.1) as an easier
// alternative. Google needs a one-time OAuth client set up in the Supabase
// Auth dashboard (Authentication > Providers > Google) before it'll work -
// see AuthContext.tsx / project notes for the exact steps.
export function LoginScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
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
      // Deliberately generic - doesn't confirm whether the email has an
      // account. Same "invalid credentials" wording Supabase itself returns
      // for both a wrong password and a non-existent email; changing that
      // would let anyone check whether a given email uses Quiet Signal,
      // which is itself sensitive information for this kind of app.
      Alert.alert(
        "Couldn't log you in",
        "Double-check your email and password and try again. New here? Use \"Create an account\" below."
      );
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
      <View style={[styles.titlePill, { backgroundColor: theme.surface + "F0" }]}>
        <Text style={[styles.title, { color: theme.text }]}>Welcome back</Text>
      </View>
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

      <Pressable
        onPress={() => navigation.navigate("ForgotPassword")}
        style={{ marginTop: spacing.sm, alignSelf: "center" }}
        hitSlop={8}
      >
        <TextOnPhoto style={{ alignSelf: "center" }}>
          <Text style={{ color: theme.textMuted }}>Forgot your password?</Text>
        </TextOnPhoto>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <TextOnPhoto style={styles.dividerLabelPill}>
          <Text style={{ color: theme.textMuted, fontSize: fontSizes.label }}>or</Text>
        </TextOnPhoto>
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

      <Pressable onPress={() => navigation.navigate("SignUp")} style={{ marginTop: spacing.md, alignItems: "center" }}>
        <TextOnPhoto style={{ alignSelf: "center" }}>
          <Text style={{ color: theme.textMuted }}>New here? Create an account</Text>
        </TextOnPhoto>
      </Pressable>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  titlePill: { alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.lg },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, fontSize: fontSizes.body },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabelPill: { marginHorizontal: spacing.sm, alignSelf: "center" },
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
