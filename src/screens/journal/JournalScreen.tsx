import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, Alert, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
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
      {/* This screen had no keyboard handling at all before: the write box
          was a plain (non-scrolling) View with an auto-growing TextInput, so
          a long entry just kept getting taller past the bottom of the screen
          with nothing to reveal the part hidden behind the keyboard. A first
          fix tracked keyboard height manually via Keyboard.addListener, but
          that depends on the window actually resizing when the keyboard
          opens - on this app's Android SDK 36 / edge-to-edge target,
          adjustResize behaves like adjustNothing (the OS hands over IME
          insets instead of resizing anything), so that event never reliably
          fired and the fix didn't hold up on a real device. KeyboardAwareScrollView
          (react-native-keyboard-controller, see KeyboardProvider in App.tsx)
          reads the native IME inset/animation directly instead, so the
          cursor stays visible above the keyboard regardless of that
          edge-to-edge behavior. The input's own fixed height (see
          styles.input) still bounds it instead of letting it grow forever,
          turning it into a normal scrollable text box. */}
      <View style={styles.container}>
        <TextOnPhoto style={styles.titleCard}>
          <Text style={[styles.title, { color: theme.text }]}>Journal</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Private, always - just for you. Never shared, only scanned for your safety.
          </Text>
        </TextOnPhoto>

        {/* The write-in box is the actual point of this screen, so it gets
            the vertical center and most of the room - not squeezed above a
            list of old entries. justifyContent: "center" on this flex:1
            wrapper is what pushes it to the middle of the remaining space
            between the title and the entries toggle below. */}
        <KeyboardAwareScrollView
          style={[styles.writeSection, showEntries && styles.writeSectionCompact]}
          contentContainerStyle={showEntries ? styles.writeContentCompact : styles.writeContentCentered}
          bottomOffset={spacing.lg}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            placeholder="Write whatever's on your mind..."
            placeholderTextColor={theme.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface + "F0" }]}
          />
          <PrimaryButton label="Save entry" onPress={handleSave} loading={saving} />
        </KeyboardAwareScrollView>

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
  // writeSection is now the outer `style` of a KeyboardAwareScrollView
  // (flex: 1 sizes it against its siblings, same as before). The centering
  // that used to live here moves to the contentContainerStyle variants below,
  // since centering has to happen on the scrollable content, not the
  // scroll-view frame itself.
  // minHeight: 0 matters here: a plain flex: 1 child refuses to shrink below
  // its own content's intrinsic size (the fixed-height input + button below
  // it, ~300px). That's invisible until the keyboard opens and the
  // (flex: 1) `container` around this actually shrinks to fit above it -
  // without minHeight: 0, this ScrollView held its ground at ~300px instead
  // of shrinking with it, so the disclosure row below ("Show saved entries")
  // got pushed into/over the Save entry button instead of this view
  // properly shrinking and scrolling its own content internally.
  writeSection: { flex: 1, minHeight: 0 },
  // When saved entries are expanded, the write box stops taking the
  // remaining space so the list below flows cleanly instead of the box
  // pushing the toggle row down. Collapsed, it takes the remaining space
  // (above).
  writeSectionCompact: { flex: 0 },
  writeContentCentered: { flexGrow: 1, justifyContent: "center" },
  writeContentCompact: { justifyContent: "flex-start" },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    // Fixed height (not flex/minHeight) so the box has a real bound
    // regardless of what kind of parent it's in - KeyboardAwareScrollView's
    // content container sizes to its content, so a flex: 1 child here
    // wouldn't be bounded the way it was in a plain flex column. A long
    // entry scrolls inside this box on its own once it exceeds this height;
    // KeyboardAwareScrollView is what keeps the cursor's line above the
    // keyboard as it's typed.
    height: 220,
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
