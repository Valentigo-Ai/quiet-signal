// checkin-archive-scan
// Triggered nightly by pg_cron (service role, no user JWT - internal
// scheduled job, protected by a shared secret header, same pattern as
// nightly-journal-scan).
//
// What this does: finds check-ins older than the 90-day retention
// window, rolls them into a monthly summary per user (rounded pain/
// anxiety/energy averages + theme tags pulled from that month's notes),
// then deletes the raw daily rows once they're safely summarized.
//
// Retention is the same for every user regardless of tier - this job
// does not check isPro. Tier only ever gates what the trends view lets
// someone *look back at*, never how long raw detail is *kept*. There's
// also no reliable server-side Pro flag to check yet (real payments
// aren't wired up).
//
// NOTE: checkins -> shared_messages has ON DELETE CASCADE. If a check-in
// that was shared with a recipient gets archived here, its shared_messages
// row (and that recipient's view link) is deleted along with it. That's a
// real side effect worth being aware of, not something this job works
// around - a shared link from more than 90 days ago will stop resolving.

import { createClient } from "npm:@supabase/supabase-js@2";
import { countThemeOccurrences } from "../_shared/themeDictionary.ts";

const RETENTION_DAYS = 90;
const BATCH_LIMIT = 1000;

type RawCheckin = {
  id: string;
  user_id: string;
  date: string;
  pain_score: number;
  anxiety_score: number;
  energy_score: number;
  note: string | null;
};

type MonthGroup = {
  ids: string[];
  painSum: number;
  anxietySum: number;
  energySum: number;
  days: number;
  notes: string[];
};

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data: oldCheckins, error } = await supabase
    .from("checkins")
    .select("id, user_id, date, pain_score, anxiety_score, energy_score, note")
    .lt("date", cutoffStr)
    .limit(BATCH_LIMIT);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const checkins = (oldCheckins ?? []) as RawCheckin[];
  if (checkins.length === 0) {
    return new Response(JSON.stringify({ archived: 0, summariesUpdated: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Group eligible check-ins by user + calendar month.
  const groups = new Map<string, MonthGroup>(); // key: `${userId}|${monthStart}`

  for (const c of checkins) {
    const monthStart = `${c.date.slice(0, 7)}-01`;
    const key = `${c.user_id}|${monthStart}`;
    const g: MonthGroup = groups.get(key) ?? {
      ids: [],
      painSum: 0,
      anxietySum: 0,
      energySum: 0,
      days: 0,
      notes: [],
    };
    g.ids.push(c.id);
    g.painSum += c.pain_score;
    g.anxietySum += c.anxiety_score;
    g.energySum += c.energy_score;
    g.days += 1;
    if (c.note) g.notes.push(c.note);
    groups.set(key, g);
  }

  let summariesUpdated = 0;
  let archivedCount = 0;

  for (const [key, g] of groups.entries()) {
    const [userId, monthStart] = key.split("|");
    const newThemeCounts = countThemeOccurrences(g.notes);

    // Merge with any existing partial summary for this user+month - a
    // month can be archived across several nightly runs as more of its
    // days individually cross the 90-day mark.
    const { data: existing } = await supabase
      .from("checkin_monthly_summaries")
      .select("days_logged, pain_sum, anxiety_sum, energy_sum, theme_counts")
      .eq("user_id", userId)
      .eq("month_start", monthStart)
      .maybeSingle();

    const mergedThemeCounts: Record<string, number> = { ...(existing?.theme_counts ?? {}) };
    for (const [theme, count] of Object.entries(newThemeCounts)) {
      mergedThemeCounts[theme] = (mergedThemeCounts[theme] ?? 0) + (count ?? 0);
    }

    const { error: upsertError } = await supabase.from("checkin_monthly_summaries").upsert(
      {
        user_id: userId,
        month_start: monthStart,
        days_logged: (existing?.days_logged ?? 0) + g.days,
        pain_sum: (existing?.pain_sum ?? 0) + g.painSum,
        anxiety_sum: (existing?.anxiety_sum ?? 0) + g.anxietySum,
        energy_sum: (existing?.energy_sum ?? 0) + g.energySum,
        theme_counts: mergedThemeCounts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month_start" },
    );

    // If the summary write failed, leave these raw rows alone - they'll
    // be picked up and retried on a future run rather than lost.
    if (upsertError) continue;

    summariesUpdated++;

    const { error: deleteError, count } = await supabase
      .from("checkins")
      .delete({ count: "exact" })
      .in("id", g.ids);

    if (!deleteError) archivedCount += count ?? g.ids.length;
  }

  return new Response(
    JSON.stringify({ archived: archivedCount, summariesUpdated }),
    { headers: { "Content-Type": "application/json" } },
  );
});
