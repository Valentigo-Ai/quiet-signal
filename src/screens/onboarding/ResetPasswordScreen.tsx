import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, fontSizes, fonts } from "@/lib/theme";

const MIN_PASSWORD_LENGTH = 8;

// Step 2 of password reset: enter the 6-digit code from the recovery email
// plus a new password. confirmPasswordReset verifies the code (which signs the
// user in) then sets the password; on success onAuthStateChange routes them
// into the app automatically, so no manual navigation is needed here.
export function ResetPasswordScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const emailFromRoute: string = route.params?.email ?? "";
  const { confirmPasswordReset, requestPasswordReset } = useAuth();
  const { getSource } = useBackgroundPrefs();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleReset = async () => {
    if (code.trim().length < 6) {
      Alert.alert("Enter the code", "Type the 6-digit code from the email we just sent you.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(
        "Choose a stronger password",
        `Your new password needs to be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(emailFromRoute, code, password);
      // Success: the user is now signed in and RootNavigator will move them
      // on automatically. Nothing else to do here.
    } catch (e: any) {
      const msg = String(e?.message ?? e).toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid") || msg.includes("token")) {
        Alert.alert(
          "That code didn't work",
          "It may be wrong or expired. Codes last a short time - tap \"Resend code\" to get a fresh one."
        );
      } else {
        Alert.alert("Couldn't reset your password", "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!emailFromRoute) {
      navigation.goBack();
      return;
    }
    setResending(true);
    try {
      await requestPasswordReset(emailFromRoute);
      Alert.alert("Code sent", "We've sent a new code to your email.");
    } catch {
      Alert.alert("Couldn't resend", "Please check your connection and try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenBackground source={getSource("login")}>
      <View style={styles.container}>
        <View style={[styles.titlePill, { backgroundColor: theme.surface + "F0" }]}>
          <Text style={[styles.title, { color: theme.text }]}>Enter your code</Text>
        </View>

        <TextOnPhoto style={styles.introPill}>
          <Text style={{ color: theme.textMuted, fontSize: fontSizes.body, lineHeight: 22 }}>
            {emailFromRoute
              ? `Enter the 6-digit code we sent to ${emailFromRoute}, then choose a new password.`
              : "Enter the 6-digit code from your email, then choose a new password."}
          </Text>
        </TextOnPhoto>

        <TextInput
          placeholder="6-digit code"
          placeholderTextColor={theme.textMuted}
          keyboardType="number-pad"
          autoFocus
          maxLength={6}
          value={code}
          onChangeText={setCode}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface + "F0", letterSpacing: 4 }]}
        />

        <View style={[styles.passwordRow, { borderColor: theme.border, backgroundColor: theme.surface + "F0" }]}>
          <TextInput
            placeholder="New password"
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

        <PrimaryButton label="Reset password" onPress={handleReset} loading={loading} disabled={resending} />

        <Pressable onPress={handleResend} disabled={loading || resending} style={{ marginTop: spacing.md, alignItems: "center" }}>
          <TextOnPhoto style={{ alignSelf: "center" }}>
            <Text style={{ color: theme.textMuted }}>{resending ? "Sending..." : "Resend code"}</Text>
          </TextOnPhoto>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Login")} style={{ marginTop: spacing.sm, alignItems: "center" }}>
          <TextOnPhoto style={{ alignSelf: "center" }}>
            <Text style={{ color: theme.textMuted }}>Back to log in</Text>
          </TextOnPhoto>
        </Pressable>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  titlePill: { alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  introPill: { alignSelf: "stretch", marginBottom: spacing.lg },
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, fontSize: fontSizes.body },
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
