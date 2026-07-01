import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in dev rather than silently hitting nothing.
  console.warn(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY - copy .env.example to .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Edge function helpers -----------------------------------------------------

export async function generateMessage(checkinId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-message", {
    body: { checkin_id: checkinId },
  });
  if (error) throw error;
  return data.message as string;
}

export async function shareCheckin(params: {
  checkinId: string;
  recipientId: string;
  messageText: string;
}) {
  const { data, error } = await supabase.functions.invoke("share-checkin", {
    body: {
      checkin_id: params.checkinId,
      recipient_id: params.recipientId,
      message_text: params.messageText,
    },
  });
  if (error) throw error;
  return data as { shared_message_id: string; view_url: string; delivery: unknown };
}
