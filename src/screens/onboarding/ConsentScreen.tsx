import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, fontSizes } from "@/lib/theme";
import { HEALTH_DATA_CONSENT_COPY, AGE_GATE_COPY } from "@/constants/legalCopy";

// Section 11.1 - dedicated, specific health-data consent screen, separate
// from general ToS. No pre-ticked boxes; both checks must be actively
// opted into before continuing. 18+ age gate, no under-18 flow in MVP.
export function ConsentScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const canContinue = ageConfirmed && consentGiven;

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
        onPress={() =>
          navigation.navigate("SignUp", {
            ...route.params,
            ageConfirmed,
            consentGivenAt: new Date().toISOString(),
          })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: fontSizes.title, fontWeight: "700", marginBottom: spacing.md },
  body: { fontSize: fontSizes.label, lineHeight: 22, marginBottom: spacing.lg },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.sm },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2 },
  checkboxLabel: { flex: 1, fontSize: fontSizes.label },
});
