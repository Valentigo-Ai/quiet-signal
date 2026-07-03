// themeDictionary.ts
//
// Lexicon-based theme detection - no AI vendor, matches the same
// non-negotiable (Section 10) as CRISIS_PATTERNS in nightly-journal-scan.
//
// Each theme is a plain-language category (the kind of thing that'd show
// up in a monthly summary or weekly journal insight) mapped to a set of
// regex patterns that catch common variants, tenses, and phrasings of
// that idea - so "sleep", "sleeping", "insomnia", and "couldn't sleep"
// all count toward the same "sleep" theme instead of splintering into
// separate words the way simple word-frequency counting does.
//
// Design choice for low maintenance: longer, distinctive word roots
// (sleep, insomnia, exhaust, migraine, isolat-) are matched as loose
// substrings with no word-boundary anchors, so plurals, "-ing", "-ed",
// "un-"/"over-" prefixes etc. are caught automatically without adding
// every inflection by hand. Short/common words (low, hot, cold, sore,
// sad, rent) are anchored with \b on both sides so they don't false-
// -positive match inside unrelated words (e.g. "low" inside "allow").
//
// This will still occasionally need a new pattern added as you notice
// gaps in real usage - no fixed lexicon stays complete forever - but the
// substring-over-exact-word approach means that should be rare, not a
// recurring chore.

export type ThemeId =
  | "sleep"
  | "work"
  | "pain"
  | "family"
  | "relationships"
  | "mood"
  | "weather"
  | "medical"
  | "money"
  | "exercise"
  | "appetite"
  | "coping"
  | "struggling";

export const THEME_LABELS: Record<ThemeId, string> = {
  sleep: "Sleep",
  work: "Work",
  pain: "Pain / flare-ups",
  family: "Family",
  relationships: "Relationships & social",
  mood: "Mood",
  weather: "Weather",
  medical: "Appointments & medication",
  money: "Money",
  exercise: "Movement & exercise",
  appetite: "Appetite & food",
  coping: "Good days & coping",
  struggling: "Bad days & struggling",
};

export const THEME_PATTERNS: Record<ThemeId, RegExp[]> = {
  sleep: [
    /sleep/i, // sleep, sleeping, sleepless, oversleep, asleep
    /insomnia/i,
    /\bawake\b/i,
    /nightmare/i,
    /\bnap(s|ping|ped)?\b/i,
    /restless/i,
    /\btired\b/i,
    /exhaust/i, // exhausted, exhaustion, exhausting
    /fatigue/i,
    /drowsy/i,
    /groggy/i,
  ],

  work: [
    /\bwork(ed|ing|load|place)?\b/i,
    /\bjob\b/i,
    /deadline/i,
    /\bboss\b/i,
    /\bmeeting/i,
    /\bshift(s)?\b/i,
    /co[\s-]?worker/i,
    /colleague/i,
    /overtime/i,
    /\bcareer\b/i,
    /\boffice\b/i,
    /commut(e|ing)/i,
    /\bproject(s)?\b/i,
  ],

  pain: [
    /\bflare([\s-]?up)?\b/i,
    /\bach(e|es|ing|y)\b/i,
    /\bsore\b/i,
    /\bstiff(ness)?\b/i,
    /throbbing/i,
    /stabbing/i,
    /burning/i,
    /\bsharp\b/i,
    /\bcramp(s|ing)?\b/i,
    /spasm/i,
    /swelling/i,
    /migraine/i,
    /headache/i,
  ],

  family: [
    /\bfamily\b/i,
    /\bkids?\b/i,
    /\bchild(ren)?\b/i,
    /\bpartner\b/i,
    /\bspouse\b/i,
    /\bhusband\b/i,
    /\bwife\b/i,
    /\bboyfriend\b/i,
    /\bgirlfriend\b/i,
    /\b(mum|mom|mother)\b/i,
    /\b(dad|father)\b/i,
    /\bparent(s)?\b/i,
    /\bsibling(s)?\b/i,
    /\bbrother\b/i,
    /\bsister\b/i,
  ],

  relationships: [
    /argument/i,
    /\bfight(ing)?\b/i,
    /conflict/i,
    /break[\s-]?up/i,
    /\blonely\b/i,
    /\balone\b/i,
    /isolat/i, // isolated, isolation, isolating
    /\bfriend(s)?\b/i,
    /\bsocial(ly|ising|izing)?\b/i,
    /withdraw/i,
    /\bavoid(ing|ed)?\b/i,
  ],

  mood: [
    /\bsad\b/i,
    /\bdown\b/i,
    /\blow\b/i,
    /depress/i, // depressed, depression, depressing
    /anxious/i,
    /anxiety/i,
    /\bworried\b/i,
    /\bworry\b/i,
    /overwhelm/i,
    /frustrat/i,
    /\bangry\b/i,
    /irritab/i,
    /\bnumb\b/i,
    /hopeless/i,
    /\bstressed?\b/i,
    /\bpanic/i,
  ],

  weather: [
    /\bweather\b/i,
    /\bcold\b/i,
    /\brain(y|ing)?\b/i,
    /humid(ity)?/i,
    /\bstorm(y)?\b/i,
    /barometric/i,
    /\bpressure\b/i,
    /\bhot\b/i,
    /heatwave/i,
    /\bhumid\b/i,
  ],

  medical: [
    /\bdoctor\b/i,
    /\bappointment(s)?\b/i,
    /\btherapy\b/i,
    /\btherapist\b/i,
    /medication/i,
    /\bmeds\b/i,
    /\bpills?\b/i,
    /\bdose\b/i,
    /prescription/i,
    /\bhospital\b/i,
    /\bclinic\b/i,
    /\bGP\b/i,
    /\bnurse\b/i,
    /\btreatment\b/i,
    /diagnos/i, // diagnosis, diagnosed
  ],

  money: [
    /\bmoney\b/i,
    /\bbills?\b/i,
    /financ/i, // finance, financial, financially
    /\bdebt\b/i,
    /\brent\b/i,
    /\bafford(able)?\b/i,
    /\bbudget\b/i,
    /expensive/i,
    /\bcost(s)?\b/i,
  ],

  exercise: [
    /\bwalk(ed|ing)?\b/i,
    /exercis/i, // exercise, exercising, exercised
    /\bgym\b/i,
    /stretch/i,
    /physio/i,
    /\byoga\b/i,
    /\bmovement\b/i,
    /workout/i,
  ],

  appetite: [
    /\bappetite\b/i,
    /\beating\b/i,
    /\bhungry\b/i,
    /\bmeal(s)?\b/i,
    /\bfood\b/i,
    /skipped (a )?meal/i,
    /nause/i, // nausea, nauseous
  ],

  coping: [
    /\bbetter\b/i,
    /good day/i,
    /\bcalm(er)?\b/i,
    /relax/i, // relax, relaxed, relaxing
    /\bproud\b/i,
    /accomplish/i,
    /grateful/i,
    /\bhopeful\b/i,
    /\bprogress\b/i,
    /improv/i, // improve, improving, improved
  ],

  struggling: [
    /bad day/i,
    /rough (day|week|patch)/i,
    /terrible day/i,
    /awful day/i,
    /hard (day|time)/i,
    /difficult day/i,
    /struggl/i, // struggle, struggling, struggled
    /\btough\b/i,
    /breaking point/i,
    /rock bottom/i,
    /couldn'?t cope/i,
    /hit a wall/i,
    /barely (got through|made it|holding on)/i,
    /worst day/i,
  ],
};

export type ThemeCount = { theme: ThemeId; label: string; count: number };

/**
 * Counts how many of the given texts hit each theme at least once, and
 * returns the themes sorted by how many texts mentioned them (most
 * common first). This counts texts-that-mention-a-theme, not raw
 * pattern-match occurrences, so one long entry repeating "tired" ten
 * times doesn't drown out ten different entries each mentioning "work"
 * once - both are equally "how many days did this come up."
 */
export function extractThemesByCategory(texts: string[], topN = 5): ThemeCount[] {
  const counts = new Map<ThemeId, number>();

  for (const text of texts) {
    for (const theme of Object.keys(THEME_PATTERNS) as ThemeId[]) {
      const patterns = THEME_PATTERNS[theme];
      if (patterns.some((p) => p.test(text))) {
        counts.set(theme, (counts.get(theme) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([theme, count]) => ({ theme, label: THEME_LABELS[theme], count }));
}
