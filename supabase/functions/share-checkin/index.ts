// share-checkin
// Authenticated. Creates a shared_messages row and (best-effort) dispatches
// a push notification via Expo push API, or returns an SMS-fallback link.
// No AI vendor involved - message text is passed in from the client, which
// already got it from generate-message or the user's own edit.

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { checkin_id, recipient_id, message_text } = await req.json();
    if (!checkin_id || !recipient_id || !message_text) {
      return new Response(
        JSON.stringify({ error: "checkin_id, recipient_id and message_text are required" }),
        { status: 400 },
      );
    }

    // RLS on both tables ensures the caller owns the checkin and the recipient.
    const { data: recipient, error: recErr } = await supabase
      .from("recipients")
      .select("id, contact_method, contact_value, recipient_label")
      .eq("id", recipient_id)
      .single();
    if (recErr || !recipient) {
      return new Response(JSON.stringify({ error: "recipient not found or not accessible" }), { status: 404 });
    }

    const { data: shared, error: insertErr } = await supabase
      .from("shared_messages")
      .insert({ checkin_id, recipient_id, message_text })
      .select("id, view_token, sent_at")
      .single();
    if (insertErr || !shared) {
      return new Response(JSON.stringify({ error: insertErr?.message ?? "insert failed" }), { status: 500 });
    }

    const projectUrl = Deno.env.get("SUPABASE_URL")!;
    const viewUrl = `${projectUrl}/functions/v1/get-shared-message?token=${shared.view_token}`;

    let deliveryResult: Record<string, unknown> = { method: recipient.contact_method };

    if (recipient.contact_method === "push") {
      // Expo push notification - recipient_contact_value holds an Expo push token.
      try {
        const pushResp = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            to: recipient.contact_value,
            title: "Check-in",
            body: message_text,
            data: { view_url: viewUrl },
          }),
        });
        deliveryResult.push_status = pushResp.status;
      } catch (e) {
        deliveryResult.push_error = String(e);
      }
    } else {
      // SMS fallback: MVP returns the link for the client to hand off to the
      // device's native SMS composer (no SMS vendor cost). contact_value is a phone number.
      deliveryResult.sms_link = `sms:${recipient.contact_value}?body=${encodeURIComponent(
        `${message_text} — view: ${viewUrl}`,
      )}`;
    }

    return new Response(
      JSON.stringify({ shared_message_id: shared.id, view_url: viewUrl, delivery: deliveryResult }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
