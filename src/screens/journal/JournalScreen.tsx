import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes } from "@/lib/theme";

type Entry = { id: string; date: string; entry_text: string; flagged_crisis: boolean };

// Section 4.5 - optional, private-by-default journal. The mandatory safety
// check (crisis wordlist) runs server-side, nightly, via the
// nightly-journal-scan edge function - never here on the client, and never
// skippable. This screen only captures free text and shows past entries.
export function JournalScreen() {
  const { theme } = useAppTheme();
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Journal</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Private by default - just for you, unless you choose otherwise.
      </Text>

      <TextInput
        placeholder="Write whatever's on your mind..."
        placeholderTextColor={theme.textMuted}
        value={text}
        onChangeText={setText}
        multiline
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      <PrimaryButton label="Save entry" onPress={handleSave} loading={saving} />

      <FlatList
        style={{ marginTop: spacing.lg }}
        data={entries}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <View style={[styles.entryRow, { borderColor: theme.border }]}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.date}</Text>
            <Text style={{ color: theme.text }}>{item.entry_text}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: fontSizes.title, fontWeight: "700" },
  subtitle: { fontSize: fontSizes.label, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: spacing.md,
    fontSize: fontSizes.body,
  },
  entryRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
