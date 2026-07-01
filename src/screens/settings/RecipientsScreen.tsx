import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes } from "@/lib/theme";

type Recipient = { id: string; recipient_label: string; contact_method: string; contact_value: string };

// Section 4.7 - add/remove people, each with a simple user-chosen label.
export function RecipientsScreen() {
  const { theme } = useAppTheme();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("recipients")
      .select("id, recipient_label, contact_method, contact_value")
      .order("created_at", { ascending: true });
    setRecipients(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!label || !phone) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("recipients").insert({
        user_id: userData.user?.id,
        recipient_label: label,
        contact_method: "sms",
        contact_value: phone,
      });
      if (error) {
        Alert.alert("Couldn't add", error.message);
        return;
      }
      setLabel("");
      setPhone("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    await supabase.from("recipients").delete().eq("id", id);
    await load();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ padding: spacing.lg }}>
        <TextInput
          placeholder="Label (e.g. Partner, Mum)"
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
        <PrimaryButton label="Add" onPress={handleAdd} loading={saving} />
      </View>

      <FlatList
        data={recipients}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderColor: theme.border }]}>
            <View>
              <Text style={{ color: theme.text, fontWeight: "600" }}>{item.recipient_label}</Text>
              <Text style={{ color: theme.textMuted }}>{item.contact_value}</Text>
            </View>
            <Pressable onPress={() => handleRemove(item.id)}>
              <Text style={{ color: theme.danger }}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, fontSize: fontSizes.body },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
