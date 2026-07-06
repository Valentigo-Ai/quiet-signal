import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator, Linking, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { supabase, generateMessage, shareCheckin } from "@/lib/supabase";
import { spacing, fontSizes, fonts } from "@/lib/theme";

type Recipient = { id: string; recipient_label: string };

// The core differentiator (Section 4.3) - do not de-scope. Auto-generates a
// gentle, human-readable message via the generate-message edge function
// (rule-based, no AI vendor), lets the user edit it, pick a recipient, and
// send - or just keep today private.
export function ShareFlowScreen() {
  const { theme } = useAppTheme();
  const { getSource } = useBackgroundPrefs();
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
      const result = await shareCheckin({
        checkinId,
        recipientId: selectedRecipient.id,
        messageText: message,
      });

      // If this recipient is reached by phone number (not push), the
      // share-checkin function hands back a native `sms:` deep link rather
      // than sending anything itself - there's no SMS vendor in the loop,
      // so nothing is billed to the app. Opening it here hands off to the
      // person's own Messages app, pre-filled, sent on their own plan/credit,
      // same as if they'd typed it themselves. Previously this link was
      // generated but never opened, so phone-number recipients never
      // actually received anything - this is the fix for that.
      const delivery = result?.delivery as { sms_link?: string } | undefined;
      if (delivery?.sms_link) {
        const canOpen = await Linking.canOpenURL(delivery.sms_link);
        if (canOpen) {
          await Linking.openURL(delivery.sms_link);
        } else if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
          // Desktop browsers have no phone/SMS app to hand off to at all -
          // this is the expected path there, not an error case. Copying the
          // message means the person can still paste it into email,
          // WhatsApp Web, or wherever they'd actually reach this recipient
          // from a computer, rather than just hitting a dead end.
          await navigator.clipboard.writeText(message);
          Alert.alert(
            "Message copied",
            "Your device can't send a text directly from here, so we've copied the message - paste it into an email or chat with the person you'd like to reach."
          );
        } else {
          Alert.alert(
            "Couldn't open Messages",
            "We saved this, but couldn't open your messaging app automatically. You can share it yourself from Settings > Shared with."
          );
        }
      }

      navigation.navigate("Main", { screen: "CheckIn" });
    } catch (e: any) {
      Alert.alert("Couldn't send", e.message ?? String(e));
    } finally {
      setSending(false);
    }
  };

  const keepPrivate = () => navigation.navigate("Main", { screen: "CheckIn" });

  const goAddRecipient = () => {
    navigation.navigate("Main", { screen: "Settings", params: { screen: "Recipients" } });
  };

  return (
    <ScreenBackground source={getSource("share")} edges={["bottom", "left", "right"]}>
      <View style={styles.container}>
        <TextOnPhoto style={{ marginBottom: spacing.lg }}>
          <Text style={[styles.title, { color: theme.text }]}>Share today's check-in?</Text>
        </TextOnPhoto>

        {loadingMessage ? (
          <ActivityIndicator style={{ marginVertical: spacing.lg }} color={theme.primary} />
        ) : (
          <>
            <TextOnPhoto style={{ marginBottom: spacing.sm }}>
              <Text style={[styles.label, { color: theme.text }]}>Message preview</Text>
            </TextOnPhoto>
            {/* This input had no background at all before, so the photo
                showed straight through it - the exact "can't read the
                writing" issue reported from a real device. Every other
                text input in the app (CheckIn's note, Journal's entry box)
                already gets an opaque backgroundColor; this one was missed. */}
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              style={[
                styles.messageBox,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface + "F0" },
              ]}
            />

            <TextOnPhoto style={{ marginBottom: spacing.sm }}>
              <Text style={[styles.label, { color: theme.text }]}>Share with</Text>
            </TextOnPhoto>
            {recipients.length === 0 ? (
              <View style={[styles.noRecipientsCard, { backgroundColor: theme.surface + "F0", borderColor: theme.border }]}>
                <Text style={{ color: theme.textMuted, marginBottom: spacing.sm }}>
                  You haven't added anyone yet - add someone to let them know how you're doing, or keep this
                  just for you.
                </Text>
                <Pressable
                  onPress={goAddRecipient}
                  style={[
                    styles.addRecipientButton,
                    { borderColor: theme.primary, minHeight: theme.minTouchTarget },
                  ]}
                >
                  <Text style={{ color: theme.primary, fontWeight: "600" }}>+ Add someone to share with</Text>
                </Pressable>
              </View>
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
                      <Text style={{ color: isSelected ? theme.onPrimary : theme.text }}>{item.recipient_label}</Text>
                    </Pressable>
                  );
                }}
              />
            )}
          </>
        )}

        <View style={{ flex: 1 }} />
        <PrimaryButton label="Let someone know" onPress={handleShare} loading={sending} disabled={loadingMessage} />
        <Pressable onPress={keepPrivate} style={{ marginTop: spacing.md, alignItems: "center", minHeight: theme.minTouchTarget, justifyContent: "center" }}>
          <TextOnPhoto style={{ alignSelf: "center" }}>
            <Text style={{ color: theme.text }}>Just for me today</Text>
          </TextOnPhoto>
        </Pressable>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading, marginBottom: spacing.lg },
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
  noRecipientsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  addRecipientButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
});
