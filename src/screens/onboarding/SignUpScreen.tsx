import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes } from "@/lib/theme";
import { CONSENT_VERSION } from "@/constants/legalCopy";

export function SignUpScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    presentingConcerns = [],
    presentingConcernsOther = "",
    ageConfirmed = false,
    consentGivenAt,
  } = route.params ?? {};

  const handleSignUp = async () => {
    if (!email || password.length < 8) {
      Alert.alert("Almost there", "Please enter an email and a password of at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password);
      // supabase.auth.signUp() may require email confirmation depending on
      // project settings; getUser() still returns the new user id here so we
      // can write the profile row (protected by RLS: auth.uid() = user_id).
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId) {
        await supabase.from("profiles").upsert({
          user_id: userId,
          presenting_concerns: presentingConcerns,
          presenting_concerns_other: presentingConcernsOther || null,
          age_confirmed: ageConfirmed,
          consent_given_at: consentGivenAt ?? new Date().toISOString(),
          consent_version: CONSENT_VERSION,
        });
      }
      navigation.navigate("AddFirstRecipient");
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Create your account</Text>
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
        placeholder="Password (min 8 characters)"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      <PrimaryButton label="Create account" onPress={handleSignUp} loading={loading} />
      <Pressable onPress={() => navigation.navigate("Login")} style={{ marginTop: spacing.md, alignItems: "center" }}>
        <Text style={{ color: theme.textMuted }}>Already have an account? Log in</Text>
      </Pressable>
      <Text style={[styles.note, { color: theme.textMuted }]}>
        Google sign-in is available from the Login screen as an alternative.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  title: { fontSize: fontSizes.title, fontWeight: "700", marginBottom: spacing.lg },
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, fontSize: fontSizes.body },
  note: { fontSize: 12, textAlign: "center", marginTop: spacing.lg },
});
