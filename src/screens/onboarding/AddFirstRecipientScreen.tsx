import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes, fonts } from "@/lib/theme";

// Optional, skippable step (Section 4.1 / Flow A step 4). Can always be
// done later from Settings > Shared with.
export function AddFirstRecipientScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const finish = () => {
    // Session flips RootNavigator over to Main automatically once signed in.
  };

  const handleAdd = async () => {
    if (!label || !phone) {
      Alert.alert("Almost there", "Add a label (e.g. 'Mum') and a phone number, or skip for now.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      await supabase.from("recipients").insert({
        user_id: userId,
        recipient_label: label,
        contact_method: "sms", // MVP default; push requires the recipient's own device token
        contact_value: phone,
      });
      finish();
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Add someone to share with?</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Totally optional - you can add or remove people any time from Settings.
      </Text>
      <TextInput
        placeholder="Label (e.g. Partner, Mum, Alex)"
        placeholderTextColor={theme.textMuted}
        value={label}
        onChangeText={setLabel}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      <TextInput
        placeholder="Phone number"
        placeholderTextColor={theme.textMuted}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      <PrimaryButton label="Add and finish" onPress={handleAdd} loading={saving} />
      <Pressable onPress={finish} style={{ marginTop: spacing.md, alignItems: "center" }}>
        <Text style={{ color: theme.textMuted }}>Skip for now</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSizes.label, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, fontSize: fontSizes.body },
});
