import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase, generateMessage, shareCheckin } from "@/lib/supabase";
import { spacing, fontSizes } from "@/lib/theme";

type Recipient = { id: string; recipient_label: string };

// The core differentiator (Section 4.3) - do not de-scope. Auto-generates a
// gentle, human-readable message via the generate-message edge function
// (rule-based, no AI vendor), lets the user edit it, pick a recipient, and
// send - or just keep today private.
export function ShareFlowScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { checkinId } = route.params ?? {};

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [message, setMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: recData }, generated] = await Promise.all([
        supabase.from("recipients").select("id, recipient_label").order("created_at", { ascending: true }),
        generateMessage(checkinId).catch(() => "Checked in today."),
      ]);
      setRecipients(recData ?? []);
      setMessage(generated);
      setLoadingMessage(false);
    })();
  }, [checkinId]);

  const handleShare = async () => {
    if (!selectedRecipient) {
      Alert.alert("Pick someone", "Choose who you'd like to share this with, or keep it private.");
      return;
    }
    setSending(true);
    try {
      await shareCheckin({ checkinId, recipientId: selectedRecipient.id, messageText: message });
      navigation.navigate("Main", { screen: "CheckIn" });
    } catch (e: any) {
      Alert.alert("Couldn't send", e.message ?? String(e));
    } finally {
      setSending(false);
    }
  };

  const keepPrivate = () => navigation.navigate("Main", { screen: "CheckIn" });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Share today's check-in?</Text>

      {loadingMessage ? (
        <ActivityIndicator style={{ marginVertical: spacing.lg }} color={theme.primary} />
      ) : (
        <>
          <Text style={[styles.label, { color: theme.text }]}>Message preview</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            style={[styles.messageBox, { color: theme.text, borderColor: theme.border }]}
          />

          <Text style={[styles.label, { color: theme.text }]}>Share with</Text>
          {recipients.length === 0 ? (
            <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
              You haven't added anyone yet - add someone from Settings, or keep this just for you.
            </Text>
          ) : (
            <FlatList
              data={recipients}
              keyExtractor={(r) => r.id}
              horizontal
              renderItem={({ item }) => {
                const isSelected = selectedRecipient?.id === item.id;
                return (
                  <Pressable
                    onPress={() => setSelectedRecipient(item)}
                    style={[
                      styles.recipientChip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.primarySoft,
                        minHeight: theme.minTouchTarget,
                      },
                    ]}
                  >
                    <Text style={{ color: isSelected ? "#FFF" : theme.text }}>{item.recipient_label}</Text>
                  </Pressable>
                );
              }}
            />
          )}
        </>
      )}

      <View style={{ flex: 1 }} />
      <PrimaryButton label="Send" onPress={handleShare} loading={sending} disabled={loadingMessage} />
      <Pressable onPress={keepPrivate} style={{ marginTop: spacing.md, alignItems: "center" }}>
        <Text style={{ color: theme.textMuted }}>Just for me today</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: fontSizes.title, fontWeight: "700", marginBottom: spacing.lg },
  label: { fontSize: fontSizes.label, fontWeight: "600", marginBottom: spacing.sm },
  messageBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
    fontSize: fontSizes.body,
  },
  recipientChip: {
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    marginRight: spacing.sm,
  },
});
