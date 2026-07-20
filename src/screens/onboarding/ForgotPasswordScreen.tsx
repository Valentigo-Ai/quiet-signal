import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, fontSizes, fonts } from "@/lib/theme";

// Step 1 of password reset: ask for the email, trigger the recovery email.
// Uses a code (OTP) flow rather than a magic link - see AuthContext
// requestPasswordReset / confirmPasswordReset. Google-only accounts have no
// password, so this is for email/password users; the messaging stays generic
// and never confirms whether an account exists for a given email.
export function ForgotPasswordScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const { requestPasswordReset } = useAuth();
  const { getSource } = useBackgroundPrefs();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert("Enter your email", "Type the email you signed up with so we can send a reset code.");
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      // Always advance to the code screen, whether or not the email had an
      // account - not disclosing that is deliberate for a health app.
      navigation.navigate("ResetPassword", { email: email.trim() });
    } catch (e: any) {
      Alert.alert(
        "Couldn't send the code",
        "Something went wrong sending your reset code. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground source={getSource("login")}>
      <View style={styles.container}>
        <View style={[styles.titlePill, { backgroundColor: theme.surface + "F0" }]}>
          <Text style={[styles.title, { color: theme.text }]}>Reset your password</Text>
        </View>

        <TextOnPhoto style={styles.introPill}>
          <Text style={{ color: theme.textMuted, fontSize: fontSizes.body, lineHeight: 22 }}>
            Enter your email and we'll send you a 6-digit code to set a new password.
          </Text>
        </TextOnPhoto>

        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoFocus
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface + "F0" }]}
        />

        <PrimaryButton label="Send reset code" onPress={handleSend} loading={loading} />

        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: spacing.md, alignItems: "center" }}>
          <TextOnPhoto style={{ alignSelf: "center" }}>
            <Text style={{ color: theme.textMuted }}>Remembered it? Back to log in</Text>
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
});
