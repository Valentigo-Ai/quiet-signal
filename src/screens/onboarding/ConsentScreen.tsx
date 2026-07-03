import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes, fonts } from "@/lib/theme";
import { HEALTH_DATA_CONSENT_COPY, AGE_GATE_COPY, CONSENT_VERSION } from "@/constants/legalCopy";

// Section 11.1 - dedicated, specific health-data consent screen, separate
// from general ToS. No pre-ticked boxes; both checks must be actively
// opted into before continuing. 18+ age gate, no under-18 flow in MVP.
//
// Reached two ways: (a) mid email sign-up, no session yet - continuing goes
// to SignUpScreen which creates the account. (b) already signed in via
// Google (Section 4.1) with no profile/consent on record yet - continuing
// writes the profile directly and skips straight to AddFirstRecipient,
// since there's no account left to create.
export function ConsentScreen() {
  const { theme } = useAppTheme();
  const { session, refreshConsentStatus } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [saving, setSaving] = useState(false);

  const canContinue = ageConfirmed && consentGiven;

  const handleContinue = async () => {
    const consentGivenAt = new Date().toISOString();

    if (!session) {
      navigation.navigate("SignUp", { ...route.params, ageConfirmed, consentGivenAt });
      return;
    }

    // Already authenticated (Google) - record consent now, no SignUp step.
    setSaving(true);
    try {
      const { presentingConcerns = [], presentingConcernsOther = "" } = route.params ?? {};
      const { error } = await supabase.from("profiles").upsert({
        user_id: session.user.id,
        presenting_concerns: presentingConcerns,
        presenting_concerns_other: presentingConcernsOther || null,
        age_confirmed: ageConfirmed,
        consent_given_at: consentGivenAt,
        consent_version: CONSENT_VERSION,
      });
      if (error) throw error;
      await refreshConsentStatus();
      navigation.navigate("AddFirstRecipient");
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
        <Text style={[styles.title, { color: theme.text }]}>Before you continue</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>{HEALTH_DATA_CONSENT_COPY}</Text>

        <Pressable
          onPress={() => setAgeConfirmed((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ageConfirmed }}
          style={[styles.checkboxRow, { minHeight: theme.minTouchTarget }]}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: theme.border, backgroundColor: ageConfirmed ? theme.primary : "transparent" },
            ]}
          />
          <Text style={[styles.checkboxLabel, { color: theme.text }]}>{AGE_GATE_COPY}</Text>
        </Pressable>

        <Pressable
          onPress={() => setConsentGiven((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consentGiven }}
          style={[styles.checkboxRow, { minHeight: theme.minTouchTarget }]}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: theme.border, backgroundColor: consentGiven ? theme.primary : "transparent" },
            ]}
          />
          <Text style={[styles.checkboxLabel, { color: theme.text }]}>
            I've read the above and I'm comfortable logging this health information in Quiet Signal.
          </Text>
        </Pressable>
      </ScrollView>

      <PrimaryButton
        label="Agree and continue"
        disabled={!canContinue}
        loading={saving}
        onPress={handleContinue}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading, marginBottom: spacing.md },
  body: { fontSize: fontSizes.label, lineHeight: 22, marginBottom: spacing.lg },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.sm },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2 },
  checkboxLabel: { flex: 1, fontSize: fontSizes.label },
});
