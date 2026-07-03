import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { usePro, ProPlanId } from "@/context/ProContext";
import { useCrisisCountry } from "@/context/CrisisCountryContext";
import { getProPlans } from "@/constants/proPricing";
import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, fontSizes, radii, raisedShadow, fonts } from "@/lib/theme";

// Placeholder paywall UI (Section: Pro tier, July 2026). Crisis resources,
// the daily check-in, and the journal are never gated here or anywhere else
// - only the value-add extras below are Pro. See ProContext.tsx for what
// needs to change to go live with real payments.
const BENEFITS = [
  {
    title: "Share with more than one person",
    body: "Free keeps you to one trusted contact. Pro lets you add your whole circle - partner, family, care team.",
  },
  {
    title: "Extended history & appointment-ready export",
    body: "See 90-day trends (not just 7/30) and export a clean summary to bring to a GP or therapist appointment.",
  },
  {
    title: "Extra backgrounds",
    body: "Choose any photo in the library for your Welcome, Check-in, and Share screens, not just the defaults.",
  },
];

export function UpgradeScreen() {
  const { theme } = useAppTheme();
  const { isPro, purchasePro, restorePurchases } = usePro();
  const { info: countryInfo } = useCrisisCountry();
  const navigation = useNavigation<any>();
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<ProPlanId>("yearly");
  const plans = getProPlans(countryInfo.code);

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      await purchasePro(plan);
      Alert.alert("You're on Pro", "Thanks for supporting Quiet Signal.");
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      const restored = await restorePurchases();
      Alert.alert(restored ? "Restored" : "Nothing to restore", restored ? "Your Pro access is back." : "No previous purchase found on this account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={[styles.title, { color: theme.text }]}>Quiet Signal Pro</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Everything that keeps you safe stays free, always - check-ins, journal, and crisis support are
          never behind a paywall. Pro just adds a few extras.
        </Text>

        {BENEFITS.map((b) => (
          <View key={b.title} style={[styles.card, raisedShadow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{b.title}</Text>
            <Text style={[styles.cardBody, { color: theme.textMuted }]}>{b.body}</Text>
          </View>
        ))}

        <View style={styles.planRow}>
          {(Object.keys(plans) as ProPlanId[]).map((id) => {
            const p = plans[id];
            const selected = plan === id;
            return (
              <Pressable
                key={id}
                onPress={() => setPlan(id)}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: selected ? theme.primarySoft : theme.surface,
                    borderColor: selected ? theme.primary : theme.border,
                    minHeight: theme.minTouchTarget,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                {p.savePercent ? (
                  <View style={[styles.saveBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.saveBadgeText}>Save {p.savePercent}%</Text>
                  </View>
                ) : null}
                <Text style={{ color: theme.text, fontWeight: "700" }}>{p.label}</Text>
                <Text style={[styles.price, { color: theme.text }]}>{p.price}</Text>
                <Text style={{ color: theme.textMuted, fontSize: fontSizes.label, textAlign: "center" }}>
                  {p.billingNote}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: theme.textMuted, fontSize: fontSizes.label, textAlign: "center", marginBottom: spacing.lg }}>
          Cancel anytime. Final price and currency are set by the app store at checkout.
        </Text>

        {isPro ? (
          <Text style={[styles.alreadyPro, { color: theme.success }]}>You're already on Pro. Thank you!</Text>
        ) : (
          <PrimaryButton
            label={`Start Pro - ${plans[plan].price}${plan === "monthly" ? "/mo" : "/yr"}`}
            onPress={handleSubscribe}
            loading={busy}
          />
        )}

        <Pressable onPress={handleRestore} style={{ marginTop: spacing.md, alignItems: "center" }} disabled={busy}>
          <Text style={{ color: theme.textMuted }}>Restore purchases</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: spacing.sm, alignItems: "center" }}>
          <Text style={{ color: theme.textMuted }}>Maybe later</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: fontSizes.largeTitle, fontFamily: fonts.heading, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSizes.label, marginBottom: spacing.lg, lineHeight: 21 },
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSizes.body, fontFamily: fonts.bodyBold, marginBottom: spacing.xs },
  cardBody: { fontSize: fontSizes.label, lineHeight: 20 },
  planRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBadge: {
    position: "absolute",
    top: -10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  saveBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  price: { fontSize: fontSizes.title, fontFamily: fonts.bodyBold, marginVertical: spacing.xs },
  alreadyPro: { textAlign: "center", fontWeight: "600", marginBottom: spacing.md },
});
