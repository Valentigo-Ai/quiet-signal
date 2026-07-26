import React, { useCallback, useState } from "react";
import { Text, TextInput, StyleSheet, Alert } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CrisisBanner } from "@/components/CrisisBanner";
import { ScaleInput } from "@/components/ScaleInput";
import { ScreenVideoBackground } from "@/components/ScreenVideoBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes, fonts } from "@/lib/theme";
import { useCrisisCheck } from "@/lib/useCrisisCheck";
import { reportDataError } from "@/lib/sentry";
import { PAIN_LABELS, ANXIETY_LABELS, PTSD_LABELS, ENERGY_LABELS } from "@/constants/scaleLabels";
import { normalisePresentingConcerns } from "@/constants/presentingConcerns";

// Time-aware greeting (July 2026, matches the website's hero mockup):
// "Good morning/afternoon/evening" plus a day/tonight-phrased question.
// Warmer than a generic title, and it quietly signals the app knows this is
// a moment in YOUR day - the same trick Calm's home screen uses.
function getGreeting(): { greeting: string; question: string } {
  const h = new Date().getHours();
  if (h < 12) return { greeting: "Good morning", question: "How are you doing today?" };
  if (h < 18) return { greeting: "Good afternoon", question: "How are you doing today?" };
  return { greeting: "Good evening", question: "How are you doing tonight?" };
}

// Core daily loop (Section 4.2 / Flow B). Target: under 15 seconds for a
// returning user - three tap-scales, optional note, one button.
export function CheckInScreen() {
  const { theme } = useAppTheme();
  const { session } = useAuth();
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight(); // tab bar now floats over content (see RootNavigator)
  useCrisisCheck(); // Flow D - runs quietly on every home screen open

  // Which optional check-in blocks to show, driven by what the person
  // selected on WhatAreYouDealingWithScreen and can now edit any time in
  // Settings -> "What you're tracking" (WhatYoureTrackingScreen).
  //
  // `answered` is profiles.presenting_concerns_set, not `concerns.length > 0`:
  // once the list is editable, an empty array has two very different meanings
  // (skipped onboarding vs. deliberately unticked everything) and only the
  // flag tells them apart. Both start falsy, which is the same as "hasn't
  // loaded yet" - fine, because that resolves to the identical fallback
  // below, so there's still no separate loading state to juggle.
  const [concerns, setConcerns] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);

  // useFocusEffect rather than a mount-only useEffect: Settings lives in a
  // different tab, so without a re-read on focus someone could untick PTSD,
  // come straight back here, and still be asked for a PTSD score until they
  // restarted the app - which would read as the change not having saved.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!session?.user.id) return;
        const { data, error } = await supabase
          .from("profiles")
          .select("presenting_concerns, presenting_concerns_set")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (cancelled) return;
        // Falls back to the same Anxiety-only default a never-answered
        // profile gets - already the intended behavior for "we don't know
        // what this person picked," not a lie the way an empty History list
        // would be, so this is reported but not surfaced to the person.
        if (error) reportDataError(error, "checkin-load-concerns");
        setConcerns(normalisePresentingConcerns(data?.presenting_concerns ?? []));
        setAnswered(data?.presenting_concerns_set ?? false);
      })();
      return () => {
        cancelled = true;
      };
    }, [session?.user.id])
  );

  // Default/fallback (skipped onboarding, or an existing user who onboarded
  // before this feature existed): show Anxiety only, matching the app's
  // check-in behavior before this split. Once a person HAS explicitly
  // answered, that answer is authoritative even when it means showing
  // neither block - "Chronic pain" alone, or nothing ticked at all.
  const showAnxiety = answered ? concerns.includes("anxiety") : true;
  const showPtsd = answered ? concerns.includes("ptsd") : false;

  // Starts unselected each time the screen mounts - nothing pre-highlighted
  // until the person actively taps a choice for that day (Section 4.2:
  // this should reflect a real, deliberate answer, not a leftover default).
  const [pain, setPain] = useState<number | null>(null);
  const [anxiety, setAnxiety] = useState<number | null>(null);
  const [ptsd, setPtsd] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    const missingRequired =
      pain === null ||
      energy === null ||
      (showAnxiety && anxiety === null) ||
      (showPtsd && ptsd === null);
    if (missingRequired) {
      Alert.alert("Almost there", "Please choose an option for everything shown before logging today.");
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
            // anxiety_score has no NULL column to fall back to (unlike the
            // new ptsd_score) - when the block is hidden because the person
            // told us it doesn't apply to them, 0 ("Calm"/none) is the
            // correct value for a dimension they've said isn't relevant,
            // not a placeholder guess.
            anxiety_score: showAnxiety ? anxiety : 0,
            ptsd_score: showPtsd ? ptsd : null,
            energy_score: energy,
            note: note || null,
          },
          { onConflict: "user_id,date" }
        )
        .select("id")
        .single();

      if (error || !checkin) {
        reportDataError(error ?? new Error("checkin upsert returned no row"), "checkin-save");
        Alert.alert("Couldn't save", error?.message ?? "Please try again.");
        return;
      }

      // Section 4.2: immediate option to share this or keep it just for
      // today. The subtitle just above the button (below) tells the user
      // this is coming, so landing on the share screen isn't a surprise.
      navigation.navigate("ShareFlow", { checkinId: checkin.id });
    } catch (e: any) {
      // Guarded (2026-07-24 review): a network-level throw (getUser/upsert)
      // used to fail silently - button stopped spinning, nothing saved, no
      // message. The person deserves to know their check-in didn't save.
      reportDataError(e, "checkin-save");
      Alert.alert("Couldn't save", e?.message ?? "Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenVideoBackground>
      {/* KeyboardAwareScrollView (react-native-keyboard-controller) auto-scrolls
          the focused input above the keyboard using the native IME inset/
          animation directly - see the KeyboardProvider comment in App.tsx for
          why the previous Keyboard.addListener approach didn't hold up. */}
      <KeyboardAwareScrollView
        bottomOffset={spacing.lg}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: tabBarHeight + spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <CrisisBanner />
        <TextOnPhoto style={{ marginBottom: spacing.lg }}>
          <Text style={[styles.title, { color: theme.text }]}>{getGreeting().greeting}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{getGreeting().question}</Text>
        </TextOnPhoto>

        <ScaleInput label="Pain" value={pain} onChange={setPain} scaleLabels={PAIN_LABELS} />
        {showAnxiety && (
          <ScaleInput label="Anxiety" value={anxiety} onChange={setAnxiety} scaleLabels={ANXIETY_LABELS} />
        )}
        {showPtsd && <ScaleInput label="PTSD" value={ptsd} onChange={setPtsd} scaleLabels={PTSD_LABELS} />}
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

        <PrimaryButton label="Save check-in" onPress={handleLog} loading={saving} />
        <TextOnPhoto style={{ alignSelf: "center", marginTop: spacing.sm }}>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Private by default · Share only if you choose
          </Text>
        </TextOnPhoto>

        {/* The Backgrounds teaser gallery used to live here, right under
            "Save check-in" - a Calm-style browsable photo strip on the one
            screen this whole app is built around finishing in ~15 seconds.
            Removed on purpose (per Richard, July 2026): a row of vivid,
            competing thumbnails at the exact moment someone anxious/in pain
            is trying to wrap up a quick task is decision fatigue at the
            worst possible spot, not a nice-to-have. Calm/Headspace's own
            browsable libraries live on dedicated Home/Library tabs and their
            paywall screen - places people go on purpose - not stapled onto
            the fast daily task. The full picker still lives at
            Settings > Backgrounds (BackgroundsScreen.tsx), a proper
            self-selected destination; the Upgrade screen now shows a small
            visual preview too, since selling Pro is that screen's actual
            job. Don't re-add a gallery here without revisiting that
            reasoning.

            Follow-up (also July 2026): this screen's background is now a
            fixed looping video (see ScreenVideoBackground) instead of one of
            the 63 library photos - Richard's own lake footage, graded to
            match. It's deliberately NOT one of the choices in Settings >
            Backgrounds; this screen stays a no-choices zone. The stored
            "checkin" entry in BackgroundPrefsContext is simply unused now -
            harmless, not worth ripping out since other code still reads/
            writes it uniformly across screens. */}
      </KeyboardAwareScrollView>
    </ScreenVideoBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: fontSizes.largeTitle, fontFamily: fonts.heading },
  subtitle: { fontSize: fontSizes.label, marginTop: 2 },
  label: { fontSize: fontSizes.label, fontWeight: "600" },
  helperText: { fontSize: fontSizes.label, textAlign: "center" },
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
