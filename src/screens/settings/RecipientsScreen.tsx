import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { usePro, FREE_MAX_RECIPIENTS } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { normalisePhone } from "@/lib/phone";
import { spacing, fontSizes, radii } from "@/lib/theme";

type Recipient = { id: string; recipient_label: string; contact_method: string; contact_value: string };

// Section 4.7 - add/remove people, each with a simple user-chosen label.
export function RecipientsScreen() {
  const { theme } = useAppTheme();
  const { isPro } = usePro();
  const { getSource } = useBackgroundPrefs();
  const navigation = useNavigation<any>();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const atFreeLimit = !isPro && recipients.length >= FREE_MAX_RECIPIENTS;

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
    if (atFreeLimit) {
      navigation.navigate("Upgrade");
      return;
    }
    // Store the number in full international format so it works when the share
    // is handed off to WhatsApp (which rejects local formats), not just SMS.
    const normalised = normalisePhone(phone);
    if (!normalised.ok) {
      Alert.alert(
        "Check the number",
        "That doesn't look like a valid phone number. Enter it the way you'd normally dial it - we'll handle the rest."
      );
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("recipients").insert({
        user_id: userData.user?.id,
        recipient_label: label,
        contact_method: "sms",
        contact_value: normalised.e164,
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
    <ScreenBackground source={getSource("recipients")}>
      <View style={{ padding: spacing.lg }}>
        <TextInput
          placeholder="Label (e.g. Partner, Mum)"
          placeholderTextColor={theme.textMuted}
          value={label}
          onChangeText={setLabel}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface + "F0" }]}
        />
        <TextInput
          placeholder="Phone number"
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface + "F0" }]}
        />
        {atFreeLimit ? (
          <View style={[styles.upsell, { backgroundColor: theme.primarySoft, borderColor: theme.border, borderRadius: radii.md }]}>
            <Text style={{ color: theme.text }}>
              Free plan includes 1 recipient. Upgrade to Pro for unlimited recipients - add your whole
              circle, no limit.
            </Text>
          </View>
        ) : null}
        <PrimaryButton label={atFreeLimit ? "Upgrade to add more" : "Add"} onPress={handleAdd} loading={saving} />
      </View>

      <FlatList
        data={recipients}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface + "D9" }]}>
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, fontSize: fontSizes.body },
  upsell: { borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
});
