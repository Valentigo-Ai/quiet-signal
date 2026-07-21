import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, Alert, Pressable, Keyboard } from "react-native";
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

  // Manual keyboard-height tracking instead of KeyboardAvoidingView. This app
  // targets Android SDK 36, where edge-to-edge display is enforced - the
  // classic "the OS resizes the window for the keyboard" assumption
  // (windowSoftInputMode adjustResize, which KeyboardAvoidingView leans on)
  // doesn't reliably hold under edge-to-edge. Keyboard.addListener's
  // endCoordinates.height is accurate regardless, so this screen's container
  // gets that as extra bottom padding, shrinking the flex:1 write box down to
  // whatever space is actually left above the keyboard.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
          with nothing to reveal the part hidden behind the keyboard - unlike
          CheckInScreen there wasn't even a ScrollView to fall back on. The
          fix is two parts: the input's own flex: 1 below (see styles.input)
          bounds its height instead of letting it grow forever, turning it
          into a normal scrollable text box that keeps the cursor in view on
          its own; and keyboardHeight (tracked above) is added as bottom
          padding on this container so that bounded box actually shrinks to
          fit the space left above the keyboard, rather than assuming the OS
          resizes the window for us - which doesn't reliably happen on this
          app's edge-to-edge Android target. */}
      <View style={[styles.container, { paddingBottom: spacing.lg + keyboardHeight }]}>
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
        <View style={[styles.writeSection, showEntries && styles.writeSectionCompact]}>
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
  // When saved entries are expanded, the write box stops being a centered
  // flex item and takes its natural height, so the list below flows cleanly
  // instead of the box shrinking and its centered content (the Save button)
  // overflowing onto the toggle row. Collapsed, it stays centered (above).
  writeSectionCompact: { flex: 0, justifyContent: "flex-start" },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    // Big and inviting when there's room (flex: 1 below fills whatever
    // space writeSection has when the keyboard's closed). minHeight is
    // deliberately low - 260 looked good with the keyboard closed, but with
    // it open and keyboardHeight padding shrinking the container, a 260
    // floor could still force the Save button past the visible area. 100 is
    // enough to stay usable as a text box without fighting the shrink.
    minHeight: 100,
    // flex: 1 bounds the box to whatever space writeSection actually has
    // (which shrinks via the container's keyboardHeight padding above)
    // instead of letting a multiline TextInput auto-grow past the visible
    // area. Bounded like this, it becomes a normal scrollable text box that
    // keeps the cursor in view on its own - that's what fixes a long entry
    // disappearing behind the keyboard.
    flex: 1,
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
