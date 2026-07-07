import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useAppTheme } from "@/context/ThemeContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes, fonts } from "@/lib/theme";

type Entry = { id: string; date: string; entry_text: string; flagged_crisis: boolean };

// Section 4.5 - optional, private-by-default journal. The mandatory safety
// check (crisis wordlist) runs server-side, nightly, via the
// nightly-journal-scan edge function - never here on the client, and never
// skippable. This screen only captures free text and shows past entries.
export function JournalScreen() {
  const { theme } = useAppTheme();
  const { getSource } = useBackgroundPrefs();
  const tabBarHeight = useBottomTabBarHeight(); // tab bar now floats over content (see RootNavigator)
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);
  // Saved entries are collapsed by default (Richard's request, July 2026) -
  // consistent with History's disclosure pattern, and it keeps the writing
  // box (the actual point of this screen) as the thing someone sees first
  // instead of a wall of old entries.
  const [showEntries, setShowEntries] = useState(false);

  const loadEntries = async () => {
    const { data } = await supabase
      .from("journal_entries")
      .select("id, date, entry_text, flagged_crisis")
      .order("date", { ascending: false })
      .limit(30);
    setEntries(data ?? []);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("journal_entries").insert({
        user_id: userId,
        date: today,
        entry_text: text.trim(),
      });
      if (error) {
        Alert.alert("Couldn't save", error.message);
        return;
      }
      setText("");
      await loadEntries();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground source={getSource("journal")}>
      <View style={styles.container}>
        <TextOnPhoto style={styles.titleCard}>
          <Text style={[styles.title, { color: theme.text }]}>Journal</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Private by default - just for you, unless you choose otherwise.
          </Text>
        </TextOnPhoto>

        {/* The write-in box is the actual point of this screen, so it gets
            the vertical center and most of the room - not squeezed above a
            list of old entries. justifyContent: "center" on this flex:1
            wrapper is what pushes it to the middle of the remaining space
            between the title and the entries toggle below. */}
        <View style={styles.writeSection}>
          <TextInput
            placeholder="Write whatever's on your mind..."
            placeholderTextColor={theme.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface + "F0" }]}
          />
          <PrimaryButton label="Save entry" onPress={handleSave} loading={saving} />
        </View>

        <Pressable
          onPress={() => setShowEntries((v) => !v)}
          style={[
            styles.disclosureRow,
            { borderColor: theme.border, backgroundColor: theme.surface + "E6", minHeight: theme.minTouchTarget },
          ]}
        >
          <Text style={{ color: theme.text, fontWeight: "600" }}>
            {showEntries ? "Hide saved entries" : "Show saved entries"}
          </Text>
          <Ionicons name={showEntries ? "chevron-up" : "chevron-down"} size={20} color={theme.textMuted} />
        </Pressable>

        {showEntries ? (
          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.xl }}
            data={entries}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => (
              <View style={[styles.entryRow, { borderColor: theme.border, backgroundColor: theme.surface + "D9" }]}>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.date}</Text>
                <Text style={{ color: theme.text }}>{item.entry_text}</Text>
              </View>
            )}
          />
        ) : (
          <View style={{ height: tabBarHeight + spacing.lg }} />
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  titleCard: { alignSelf: "stretch", paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.md },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  subtitle: { fontSize: fontSizes.label, marginTop: 2 },
  // flex: 1 + justifyContent: "center" is what centers the write-in box
  // vertically in the space between the title and the entries toggle.
  writeSection: { flex: 1, justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    // Was 100 - the main focus of the whole app, so it gets real room
    // instead of reading like an afterthought under a list of old entries.
    minHeight: 260,
    textAlignVertical: "top",
    marginBottom: spacing.md,
    fontSize: fontSizes.title,
  },
  disclosureRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  entryRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
});
