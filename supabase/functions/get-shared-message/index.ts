// get-shared-message
// PUBLIC, no-login endpoint for recipients (Section 4.3 / Flow C).
// Auth model: possession of the random view_token (UUID, unguessable),
// not a Supabase JWT - recipients don't have accounts. Uses the service
// role internally to bypass RLS, but only ever returns the single message
// tied to the token, never full history, unless full_history_access=true.
// Deployed with verify_jwt=false since it implements this custom auth model.

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: shared, error } = await supabase
      .from("shared_messages")
      .select("id, message_text, sent_at, viewed_at, recipient_id, recipients(recipient_label, full_history_access, user_id)")
      .eq("view_token", token)
      .single();

    if (error || !shared) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    }

    if (!shared.viewed_at) {
      await supabase.from("shared_messages").update({ viewed_at: new Date().toISOString() }).eq("id", shared.id);
    }

    // deno-lint-ignore no-explicit-any
    const recipient = (shared as any).recipients;

    const payload: Record<string, unknown> = {
      message: shared.message_text,
      sent_at: shared.sent_at,
      recipient_label: recipient?.recipient_label ?? null,
    };

    // Only if the sender has explicitly granted ongoing access do we include
    // recent history - still limited to check-in messages already shared,
    // never raw journal or full private data.
    if (recipient?.full_history_access) {
      const { data: recentShares } = await supabase
        .from("shared_messages")
        .select("message_text, sent_at")
        .eq("recipient_id", shared.recipient_id)
        .order("sent_at", { ascending: false })
        .limit(30);
      payload.recent_history = recentShares ?? [];
    }

    return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
