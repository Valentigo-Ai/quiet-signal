import React from "react";
import { View, Text, StyleSheet, Linking, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSizes } from "@/lib/theme";
import { CRISIS_RESOURCES, CRISIS_DISCLAIMER } from "@/constants/crisisResources";

// Section 4.6 / 11.5 - always accessible, plainly worded, accurate contact
// info only. No claims about confidentiality. Never attempts to respond to
// or assess a crisis itself - signposting only.
export function CrisisResourcesScreen() {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={[styles.title, { color: theme.text }]}>Support</Text>
        <Text style={[styles.disclaimer, { color: theme.danger }]}>{CRISIS_DISCLAIMER}</Text>

        {CRISIS_RESOURCES.map((r) => (
          <View key={r.name} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.name, { color: theme.text }]}>{r.name}</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>{r.description}</Text>
            {r.phone ? (
              <Pressable
                onPress={() => r.callHref && Linking.openURL(r.callHref)}
                style={[styles.callButton, { backgroundColor: theme.primarySoft, minHeight: theme.minTouchTarget }]}
                accessibilityRole="button"
                accessibilityLabel={`Call ${r.name} on ${r.phone}`}
              >
                <Text style={{ color: theme.text, fontWeight: "600" }}>Call {r.phone}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        <Text style={[styles.footer, { color: theme.textMuted }]}>
          If you're in immediate danger, please call 999.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: fontSizes.largeTitle, fontWeight: "700", marginBottom: spacing.md },
  disclaimer: { fontSize: fontSizes.label, marginBottom: spacing.lg, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  name: { fontSize: fontSizes.title, fontWeight: "700" },
  description: { fontSize: fontSizes.label, marginBottom: spacing.sm },
  callButton: { borderRadius: 10, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  footer: { textAlign: "center", marginTop: spacing.lg, fontSize: fontSizes.label },
});
