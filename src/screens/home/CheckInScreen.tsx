import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CrisisBanner } from "@/components/CrisisBanner";
import { ScaleInput } from "@/components/ScaleInput";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes, fonts } from "@/lib/theme";
import { useCrisisCheck } from "@/lib/useCrisisCheck";

const PAIN_LABELS: [string, string, string, string, string] = [
  "None",
  "Mild",
  "Moderate",
  "High",
  "Severe",
];
const ANXIETY_LABELS: [string, string, string, string, string] = [
  "Calm",
  "A little on edge",
  "Anxious",
  "Very anxious",
  "Overwhelmed",
];
const ENERGY_LABELS: [string, string, string, string, string] = [
  "Very low",
  "Low",
  "Okay",
  "Good",
  "Great",
];

// Core daily loop (Section 4.2 / Flow B). Target: under 15 seconds for a
// returning user - three tap-scales, optional note, one button.
export function CheckInScreen() {
  const { theme } = useAppTheme();
  const { getSource } = useBackgroundPrefs();
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight(); // tab bar now floats over content (see RootNavigator)
  useCrisisCheck(); // Flow D - runs quietly on every home screen open

  // Starts unselected each time the screen mounts - nothing pre-highlighted
  // until the person actively taps a choice for that day (Section 4.2:
  // this should reflect a real, deliberate answer, not a leftover default).
  const [pain, setPain] = useState<number | null>(null);
  const [anxiety, setAnxiety] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    if (pain === null || anxiety === null || energy === null) {
      Alert.alert("Almost there", "Please choose an option for pain, anxiety, and energy before logging today.");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const today = new Date().toISOString().slice(0, 10);

      const { data: checkin, error } = await supabase
        .from("checkins")
        .upsert(
          {
            user_id: userId,
            date: today,
            pain_score: pain,
            anxiety_score: anxiety,
            energy_score: energy,
            note: note || null,
          },
          { onConflict: "user_id,date" }
        )
        .select("id")
        .single();

      if (error || !checkin) {
        Alert.alert("Couldn't save", error?.message ?? "Please try again.");
        return;
      }

      // Section 4.2: immediate option to share this or keep it just for today.
      navigation.navigate("ShareFlow", { checkinId: checkin.id });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground source={getSource("checkin")}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarHeight + spacing.lg }}>
        <CrisisBanner />
        <TextOnPhoto style={{ marginBottom: spacing.lg }}>
          <Text style={[styles.title, { color: theme.text }]}>How are you today?</Text>
        </TextOnPhoto>

        <ScaleInput label="Pain" value={pain} onChange={setPain} scaleLabels={PAIN_LABELS} />
        <ScaleInput label="Anxiety / PTSD state" value={anxiety} onChange={setAnxiety} scaleLabels={ANXIETY_LABELS} />
        <ScaleInput label="Energy" value={energy} onChange={setEnergy} scaleLabels={ENERGY_LABELS} />

        <TextOnPhoto style={{ marginBottom: spacing.sm }}>
          <Text style={[styles.label, { color: theme.text }]}>Anything else? (optional)</Text>
        </TextOnPhoto>
        <TextInput
          placeholder="A word or two, if you want"
          placeholderTextColor={theme.textMuted}
          value={note}
          onChangeText={setNote}
          multiline
          style={[
            styles.noteInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface + "F0" },
          ]}
        />

        <PrimaryButton label="Log today" onPress={handleLog} loading={saving} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: fontSizes.largeTitle, fontFamily: fonts.heading },
  label: { fontSize: fontSizes.label, fontWeight: "600" },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
    fontSize: fontSizes.body,
  },
});
