// nightly-journal-scan
// Triggered nightly by pg_cron (service role, no user JWT - this is an
// internal scheduled job, not a public endpoint; protect via a shared
// secret header checked below).
//
// MANDATORY SAFETY ORDER (Section 4.5 / 11.4 / 11.5 - non-negotiable):
//   1. Crisis-language wordlist check runs on EVERY unprocessed entry FIRST.
//   2. Flagged entries are excluded from all pattern/insight generation.
//   3. No AI vendor, no clinical language anywhere in output - sentiment
//      score + theme words only, framed as a personal reflection aid.
//   4. This job never attempts to respond to or assess a crisis - it only
//      ever sets a flag that the app reads to show the Crisis Resources
//      screen automatically on next open (client-side behavior).

import { createClient } from "npm:@supabase/supabase-js@2";
import Sentiment from "npm:sentiment@5";
import { extractThemesByCategory } from "../_shared/themeDictionary.ts";

// Non-exhaustive starter wordlist. This MUST be reviewed and expanded by a
// clinical/safety advisor before public launch - ship-blocking per spec
// Section 4.5, but this file provides the mandatory mechanism. The extra
// patterns below (added July 2026) are common phrasings referenced in
// public crisis-line training materials, added by Claude as a good-faith
// broadening pass - this is still NOT a substitute for the clinical/safety
// review this file has always required before launch. Treat every pattern
// here as a starting point, not a finished list.
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill myself\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend it all\b/i,
  /\bwant(ed)? to die\b/i,
  /\bno reason to live\b/i,
  /\bself[\s-]?harm\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bcut(ting)? myself\b/i,
  /\bnot (worth|going to) (be here|make it)\b/i,
  /\bbetter off (dead|without me)\b/i,
  /\bcan'?t (go on|do this anymore)\b/i,
  /\bplan to (die|end it)\b/i,
  /\bno point (in )?living\b/i,
  /\bwish I (wasn'?t|weren'?t) here\b/i,
  /\btired of (living|being alive)\b/i,
  /\bwant it to (be over|stop)\b/i,
  /\bgive up on (everything|life)\b/i,
  /\bno way out\b/i,
  /\bdon'?t want to (be here|exist) anymore\b/i,
  /\bthinking about ending (it|my life)\b/i,
  /\bgoodbye (forever|for good)\b/i,
  /\beveryone('s| is) better off without me\b/i,
];

function checkCrisisLanguage(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // STEP 1: mandatory crisis-language check on every unprocessed entry, first.
  const { data: entries, error } = await supabase
    .from("journal_entries")
    .select("id, user_id, date, entry_text")
    .is("processed_at", null)
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const sentiment = new Sentiment();
  let flaggedCount = 0;

  for (const entry of entries ?? []) {
    const flagged = checkCrisisLanguage(entry.entry_text);
    if (flagged) flaggedCount++;

    const score = flagged ? null : sentiment.analyze(entry.entry_text).comparative;

    await supabase
      .from("journal_entries")
      .update({
        flagged_crisis: flagged,
        excluded_from_insights: flagged, // STEP 2: excluded from insights if flagged
        sentiment_score: score,
        processed_at: new Date().toISOString(),
      })
      .eq("id", entry.id);
  }

  // STEP 3: weekly, per-user theme/summary generation - non-flagged entries only.
  const today = new Date();
  const isWeekBoundary = today.getUTCDay() === 1; // run weekly rollup on Mondays
  let insightsGenerated = 0;

  if (isWeekBoundary) {
    const weekStart = new Date(today);
    weekStart.setUTCDate(today.getUTCDate() - 7);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const { data: recentEntries } = await supabase
      .from("journal_entries")
      .select("user_id, entry_text, sentiment_score")
      .gte("date", weekStartStr)
      .eq("excluded_from_insights", false);

    const byUser = new Map<string, { texts: string[]; scores: number[] }>();
    for (const e of recentEntries ?? []) {
      const bucket = byUser.get(e.user_id) ?? { texts: [], scores: [] };
      bucket.texts.push(e.entry_text);
      if (typeof e.sentiment_score === "number") bucket.scores.push(e.sentiment_score);
      byUser.set(e.user_id, bucket);
    }

    for (const [userId, bucket] of byUser.entries()) {
      if (bucket.texts.length === 0) continue;
      const themeCounts = extractThemesByCategory(bucket.texts);
      const avgSentiment =
        bucket.scores.reduce((a, b) => a + b, 0) / (bucket.scores.length || 1);

      // Framed strictly as a personal reflection aid - never clinical (Section 11.4).
      const topLabels = themeCounts.map((t) => t.label);
      const summary =
        topLabels.length > 0
          ? `${topLabels.slice(0, 3).join(" and ")} came up most in what you wrote this week. Just something you might want to reflect on - not a diagnosis or recommendation.`
          : "A quiet week for journal entries - nothing in particular stood out.";

      await supabase.from("journal_insights").upsert(
        {
          user_id: userId,
          week_start: weekStartStr,
          themes: topLabels,
          correlations: { avg_sentiment: avgSentiment },
          summary_text: summary,
        },
        { onConflict: "user_id,week_start" },
      );
      insightsGenerated++;
    }
  }

  return new Response(
    JSON.stringify({
      processed: entries?.length ?? 0,
      flagged: flaggedCount,
      insights_generated: insightsGenerated,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
