import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { reportDataError } from "@/lib/sentry";
import { spacing, fontSizes } from "@/lib/theme";
import {
  PRESENTING_CONCERN_OPTIONS,
  PRESENTING_CONCERNS_BLURB,
  normalisePresentingConcerns,
} from "@/constants/presentingConcerns";

// Settings -> "What you're tracking". The same question onboarding asks
// ("What are you dealing with?"), made editable afterwards.
//
// This exists because the onboarding-only version quietly locked people in:
// what someone is dealing with is exactly the kind of thing that changes, or
// that they get a name for months later, and having to delete their account
// to correct it would be an absurd cost. It also lowers the stakes of the
// original question - onboarding now says this is changeable, which makes it
// easier to answer honestly the first time.
//
// Editing this only changes which optional blocks the check-in screen asks
// for from here on. Scores already logged are never touched or hidden, so
// turning something off and back on later is completely lossless - see the
// note by handleSave.
export function WhatYoureTrackingScreen() {
  const { theme } = useAppTheme();
  const { session } = useAuth();
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight(); // tab bar floats over content (see SettingsScreen/RootNavigator)

  const [selected, setSelected] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.user.id) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("presenting_concerns, presenting_concerns_other")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      // On a read failure the screen stays on its empty defaults, which would
      // look exactly like "you've never selected anything" - and saving from
      // there would wipe a real selection the person can't see. Bail back
      // instead of showing a form that lies about the current state.
      if (error) {
        reportDataError(error, "tracking-settings-load");
        Alert.alert("Couldn't load", "We couldn't load your current choices. Please try again in a moment.");
        navigation.goBack();
        return;
      }
      setSelected(normalisePresentingConcerns(data?.presenting_concerns ?? []));
      setOther(data?.presenting_concerns_other ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, navigation]);

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSave = async () => {
    if (!session?.user.id) return;
    setSaving(true);
    try {
      // presenting_concerns_set is always true here, never `selected.length >
      // 0`. Reaching this screen and pressing Save is an explicit answer even
      // when the answer is "none of these" - without the flag, an empty list
      // is indistinguishable from having skipped onboarding and CheckInScreen
      // would switch the Anxiety block back on, overriding the choice the
      // person just made. Update, not upsert: the profile row already exists
      // by definition (they onboarded), and an upsert here could resurrect a
      // deleted row or clobber consent columns it doesn't list.
      const { error } = await supabase
        .from("profiles")
        .update({
          presenting_concerns: selected,
          presenting_concerns_other: other.trim() || null,
          presenting_concerns_set: true,
        })
        .eq("user_id", session.user.id);
      if (error) throw error;
      navigation.goBack();
    } catch (e: any) {
      reportDataError(e, "tracking-settings-save");
      Alert.alert("Couldn't save", e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>{PRESENTING_CONCERNS_BLURB}</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Tick or untick whatever fits now - you can come back and change it as often as you like.
      </Text>

      {PRESENTING_CONCERN_OPTIONS.map((opt) => {
        const isSelected = selected.includes(opt.key);
        return (
          <Pressable
            key={opt.key}
            onPress={() => toggle(opt.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={opt.label}
            style={[
              styles.option,
              {
                backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                borderColor: isSelected ? theme.primary : theme.border,
                minHeight: theme.minTouchTarget,
              },
            ]}
          >
            <Text style={{ color: theme.text, fontSize: fontSizes.body }}>{opt.label}</Text>
          </Pressable>
        );
      })}

      <TextInput
        placeholder="Something else (optional)"
        placeholderTextColor={theme.textMuted}
        value={other}
        onChangeText={setOther}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        accessibilityLabel="Something else you're dealing with, optional"
      />

      {/* Said plainly and unprompted, because the alternative is someone
          deciding not to correct their choices out of a fear that they'll
          lose months of history. Both directions are covered: nothing is
          deleted when a concern comes off, and turning one back on picks up
          where it left off. */}
      <Text style={[styles.note, { color: theme.textMuted }]}>
        Changing this only affects what you're asked from now on. Anything you've already logged stays
        in your history exactly as it is, and turning something back on later picks up right where you
        left off.
      </Text>

      <View style={{ height: spacing.lg }} />
      <PrimaryButton label="Save" onPress={handleSave} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, flexGrow: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  subtitle: { fontSize: fontSizes.label, marginBottom: spacing.md },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    fontSize: fontSizes.body,
  },
  note: { fontSize: fontSizes.label, lineHeight: 20, marginTop: spacing.lg },
});
