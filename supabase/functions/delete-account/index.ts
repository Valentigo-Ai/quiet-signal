// delete-account
// Section 4.7 / 11.1 - genuinely easy, irreversible account deletion.
// Requires the caller's own JWT (verify_jwt: true) to identify who they are,
// then uses the service role to actually delete the auth.users row. All
// dependent tables (profiles, checkins, recipients, shared_messages,
// journal_entries, journal_insights) cascade via ON DELETE CASCADE foreign
// keys defined in the initial_schema migration.

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    // Client the caller authenticated as — used only to identify the caller.
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "not authenticated" }), { status: 401 });
    }

    // Service-role client — only used for the actual deletion, scoped to the
    // caller's own verified user id, never a client-supplied id.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userData.user.id);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
