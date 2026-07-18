// generate-message
// Rule-based, template-only status message generator.
// No AI vendor call - deterministic mapping from scores to plain-language copy.
// Scale: 0=none/very low, 1=mild, 2=moderate, 3=high, 4=severe (pain/anxiety)
//        0=great, 1=good, 2=okay, 3=low, 4=very low (energy)
// Energy's direction was flipped July 2026 to match pain/anxiety (4 always
// = the concerning end, instead of energy running the opposite way) - the
// thresholds below were updated to match; this function reads live scores
// from the checkins table, so it must agree with whatever direction that
// column actually stores today, not the pre-flip convention.

import { createClient } from "npm:@supabase/supabase-js@2";

function generateMessage(pain: number, anxiety: number, energy: number): string {
  const highPain = pain >= 3;
  const highAnxiety = anxiety >= 3;
  const lowEnergy = energy >= 3;
  const goodEnergy = energy <= 1;
  const lowPain = pain <= 1;
  const lowAnxiety = anxiety <= 1;

  if (highPain && highAnxiety) {
    return "Today's a rough one — pain and anxiety are both high. Might need some quiet space.";
  }
  if (highPain && !highAnxiety) {
    return lowEnergy
      ? "Pain's high today and energy is low. Taking it slow."
      : "Pain's pretty high today, but holding steady otherwise.";
  }
  if (highAnxiety && !highPain) {
    return "Anxiety's running high today, even though the body's okay. Might be a lot going on upstairs.";
  }
  if (lowPain && lowAnxiety && goodEnergy) {
    return "Feeling pretty good today.";
  }
  if (lowPain && lowAnxiety && lowEnergy) {
    return "Doing okay pain-wise but pretty drained today.";
  }
  if (lowPain && !lowAnxiety && lowEnergy) {
    return "Body's okay, but mind's a bit noisy and energy's low today.";
  }
  // Moderate / mixed fallback — always plain language, never numbers.
  return "An okay day — nothing severe, just getting through it.";
}

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

    const { checkin_id } = await req.json();
    if (!checkin_id) {
      return new Response(JSON.stringify({ error: "checkin_id required" }), { status: 400 });
    }

    // RLS ensures only the owner can read their own checkin with their JWT.
    const { data: checkin, error } = await supabase
      .from("checkins")
      .select("pain_score, anxiety_score, energy_score")
      .eq("id", checkin_id)
      .single();

    if (error || !checkin) {
      return new Response(JSON.stringify({ error: "checkin not found or not accessible" }), { status: 404 });
    }

    const message = generateMessage(checkin.pain_score, checkin.anxiety_score, checkin.energy_score);

    return new Response(JSON.stringify({ message }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
