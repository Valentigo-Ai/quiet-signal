import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useAppTheme } from "@/context/ThemeContext";
import { usePro, FREE_HISTORY_RANGES, PRO_ONLY_HISTORY_RANGES } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { supabase } from "@/lib/supabase";
import { downloadCheckinPdfReport, ReportRow } from "@/lib/pdfReport";
import { PAIN_LABELS, ANXIETY_LABELS, ENERGY_LABELS } from "@/constants/scaleLabels";
import { spacing, fontSizes, radii, fonts, cardShadow } from "@/lib/theme";

// "2026-07-07" -> "7 July" - parsed from the Y-M-D parts directly (not
// `new Date(dateStr)`, which reads a bare date as UTC midnight and can shift
// a day off in some timezones) so the date always reads as the calendar day
// the check-in was actually logged on, everywhere in the world.
function humanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

// Minimum check-ins before a trend sentence is included in the PDF report.
// Two points always look like a confident straight-line trend even when
// they're just noise - misleading for something as personal as
// pain/anxiety/energy.
const MIN_POINTS_FOR_TREND = 3;

function describeTrend(first: number, last: number): "up" | "down" | "steady" {
  const diff = last - first;
  if (diff >= 1) return "up";
  if (diff <= -1) return "down";
  return "steady";
}

type Checkin = {
  id: string;
  date: string;
  pain_score: number;
  anxiety_score: number;
  energy_score: number;
  note: string | null;
};

// 60/90-day views summarise week by week instead of listing every single
// day - both in the collapsible on-screen list and the PDF table. 30 days
// (30 rows) is still perfectly scannable; 60-90 raw daily rows is the
// "pages and pages of data" Richard specifically wanted to avoid.
const WEEKLY_SUMMARY_MIN_RANGE = 60;

type WeekBucket = {
  label: string;
  count: number;
  // 0-4, rounded to the nearest whole score - a week's average pain/anxiety/
  // energy isn't a score anyone actually tapped, so these get shown as the
  // same plain-language labels as everywhere else (PAIN_LABELS etc.), never
  // as a raw decimal like "1.8/4". That would read exactly like the
  // clinical-sounding framing the rest of the app deliberately avoids.
  pain: number;
  anxiety: number;
  energy: number;
};

function clampScore(n: number): number {
  return Math.min(4, Math.max(0, Math.round(n)));
}

// Groups check-ins into 7-day windows anchored to today - window 0 is the
// most recent 7 days, window 1 the 7 before that, and so on - rather than
// just chunking every 7 entries, so the buckets line up with real calendar
// weeks even if some days in a week were skipped. Weeks with zero check-ins
// simply don't produce a row.
function buildWeeklyBuckets(checkins: Checkin[]): WeekBucket[] {
  if (checkins.length === 0) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups = new Map<number, Checkin[]>();
  for (const c of checkins) {
    const [y, m, d] = c.date.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);
    const windowIndex = Math.floor(diffDays / 7);
    const group = groups.get(windowIndex) ?? [];
    group.push(c);
    groups.set(windowIndex, group);
  }

  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  // Oldest window first, matching the ascending order `checkins` already
  // comes in (largest window index = furthest in the past).
  const indices = [...groups.keys()].sort((a, b) => b - a);
  return indices.map((idx) => {
    const group = groups.get(idx)!;
    const avg = (key: "pain_score" | "anxiety_score" | "energy_score") =>
      clampScore(group.reduce((sum, c) => sum + c[key], 0) / group.length);

    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() - idx * 7);
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 6);

    return {
      label: `${fmt(windowStart)} – ${fmt(windowEnd)}`,
      count: group.length,
      pain: avg("pain_score"),
      anxiety: avg("anxiety_score"),
      energy: avg("energy_score"),
    };
  });
}

const RANGES = [...FREE_HISTORY_RANGES, ...PRO_ONLY_HISTORY_RANGES] as const;

// Section 4.4 - a deliberately gentle history. Product decision (July 2026,
// Midnight Signal redesign): NO trend chart or up/down trend language on
// screen. Someone living with PTSD or anxiety opening this screen on a hard
// day shouldn't be confronted with a line that says "you're not getting
// better." The screen shows a neutral, kind summary and the plain daily
// list; trends and the chart live only in the PDF report (Pro), which the
// person downloads by explicit choice, when they feel ready to look.
export function HistoryScreen() {
  const { theme } = useAppTheme();
  const { isPro } = usePro();
  const { getSource } = useBackgroundPrefs();
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight(); // tab bar now floats over content (see RootNavigator)
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [downloading, setDownloading] = useState(false);
  // The day-by-day list is collapsed by default (Richard's request, July
  // 2026): seeing every logged day laid out on screen at once can itself
  // raise anxiety, even with no chart/trend language attached. The neutral
  // summary card is always visible; the actual entries are opt-in only, one
  // tap away, so the choice to look is always the person's, not the app's.
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - range);
      const { data } = await supabase
        .from("checkins")
        .select("id, date, pain_score, anxiety_score, energy_score, note")
        .gte("date", since.toISOString().slice(0, 10))
        .order("date", { ascending: true });
      setCheckins(data ?? []);
    })();
  }, [range]);

  // Plain-language trend sentence - PDF report only, never shown on screen
  // (see the product note above the component). Written the way a person
  // would actually say it out loud, not "X trended up" - and energy gets its
  // own phrasing (rather than reusing pain/anxiety's) so that when it moves
  // the same direction as anxiety, the sentence doesn't just repeat itself
  // ("anxiety's crept up a bit, energy's crept up a bit" reads like a
  // spreadsheet; "...energy's been trending up too" reads like a person).
  const trendSummary = useMemo(() => {
    if (checkins.length < MIN_POINTS_FOR_TREND) return null;
    const first = checkins[0];
    const last = checkins[checkins.length - 1];
    const pain = describeTrend(first.pain_score, last.pain_score);
    const anxiety = describeTrend(first.anxiety_score, last.anxiety_score);
    const energy = describeTrend(first.energy_score, last.energy_score);

    const paceWord = (dir: "up" | "down" | "steady") =>
      dir === "steady" ? "stayed steady" : dir === "up" ? "crept up a bit" : "eased off a bit";
    const energyWord = (dir: "up" | "down" | "steady") =>
      dir === "steady" ? "stayed steady" : dir === "up" ? "been trending up" : "been trending down";

    const painPhrase = `Pain's ${paceWord(pain)}`;
    const anxietyPhrase = `anxiety's ${paceWord(anxiety)}`;
    let energyPhrase = `energy's ${energyWord(energy)}`;
    if (energy !== "steady" && energy === anxiety) {
      energyPhrase += " too";
    }

    return `${painPhrase}, ${anxietyPhrase}, ${energyPhrase}.`;
  }, [checkins]);

  // null for 7/30-day views (daily list/table as before); an array of
  // week rows for 60/90-day views. Computed once here and reused by both
  // the on-screen disclosure list and the PDF export below.
  const weeklyBuckets = useMemo(() => {
    if (range < WEEKLY_SUMMARY_MIN_RANGE) return null;
    return buildWeeklyBuckets(checkins);
  }, [checkins, range]);

  const selectRange = (r: (typeof RANGES)[number]) => {
    const isProOnly = (PRO_ONLY_HISTORY_RANGES as readonly number[]).includes(r);
    if (isProOnly && !isPro) {
      navigation.navigate("Upgrade");
      return;
    }
    setRange(r);
  };

  // Builds the text that lands in the PDF report and the History "Share a
  // summary" button. Reuses the same plain-language trend sentence, human
  // dates instead of raw ISO ones, and the exact words the person tapped on
  // the check-in screen (via PAIN_LABELS etc.) instead of "X out of 4" -
  // this is a message a person shares with someone they trust, so it should
  // read like something a person would actually say, not a spreadsheet.
  const buildShareSummary = () => {
    const last = checkins[checkins.length - 1];
    const count = checkins.length;

    const checkedInPhrase =
      count === 1
        ? `Checked in once in the last ${range} days, on ${humanDate(last.date)}.`
        : `Checked in ${count} of the last ${range} days, last one on ${humanDate(last.date)}.`;

    const trendPhrase = trendSummary ?? "Not quite enough check-ins yet to show a trend.";

    const dayPhrase = `That day: pain ${PAIN_LABELS[last.pain_score]}, anxiety ${
      ANXIETY_LABELS[last.anxiety_score]
    }, energy ${ENERGY_LABELS[last.energy_score]}.`;

    const lines: string[] = [];
    lines.push(`Quiet Signal check-in summary — last ${range} days`);
    lines.push(`${checkedInPhrase} ${trendPhrase} ${dayPhrase}`);
    lines.push("");
    lines.push("Sent from Quiet Signal — a personal check-in, not a diagnosis.");

    return lines.join("\n");
  };

  // Downloads a PDF (via expo-print). The report is where trends and the
  // chart live - viewed by explicit choice, shareable with whoever the
  // person wants, doctor or otherwise.
  const handleDownloadReport = async () => {
    if (!isPro) {
      navigation.navigate("Upgrade");
      return;
    }
    if (checkins.length === 0) {
      Alert.alert("Nothing to export yet", "Log a few check-ins first.");
      return;
    }
    setDownloading(true);
    try {
      // 60/90-day reports get one row per week instead of one per day (same
      // rounded scores as the on-screen weekly summary, still numeric here
      // since the PDF's daily rows already show plain "X / 4" scores - a
      // rounded weekly average fits that same convention without
      // introducing the confusing decimal average this was built to avoid).
      const reportRows: ReportRow[] = weeklyBuckets
        ? weeklyBuckets.map((w) => ({
            date: w.label,
            pain_score: w.pain,
            anxiety_score: w.anxiety,
            energy_score: w.energy,
            note: null,
          }))
        : checkins;

      await downloadCheckinPdfReport({
        rangeLabel: `Last ${range} days`,
        summaryText: buildShareSummary(),
        rows: reportRows,
        periodLabel: weeklyBuckets ? "Week" : "Date",
      });
    } catch (e: any) {
      Alert.alert("Couldn't create report", e.message ?? "Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScreenBackground source={getSource("history")}>
      <View style={styles.container}>
        <TextOnPhoto style={{ marginBottom: spacing.md, alignSelf: "flex-start" }}>
          <Text style={[styles.title, { color: theme.text }]}>History</Text>
        </TextOnPhoto>

        {/* Horizontal scroll, not a fixed row - now that Pro adds a 4th chip
            (60 days, alongside 7/30/90), a plain row overflows the screen
            width and clips the last chip almost entirely off-screen
            (Richard's "can hardly see the 90 days" report). Scrolling keeps
            every range reachable regardless of how many get added later. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangeRow}
          style={styles.rangeScroll}
        >
          {RANGES.map((r) => {
            const isProOnly = (PRO_ONLY_HISTORY_RANGES as readonly number[]).includes(r);
            const locked = isProOnly && !isPro;
            return (
              <Pressable
                key={r}
                onPress={() => selectRange(r)}
                style={[
                  styles.rangeChip,
                  { backgroundColor: range === r ? theme.primary : theme.primarySoft, minHeight: theme.minTouchTarget },
                ]}
              >
                <Text style={{ color: range === r ? theme.onPrimary : theme.text }}>
                  {r} days{locked ? " 🔒" : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {checkins.length === 0 ? (
          <TextOnPhoto style={{ margin: spacing.lg, alignSelf: "flex-start" }}>
            <Text style={{ color: theme.textMuted }}>No check-ins in this range yet.</Text>
          </TextOnPhoto>
        ) : (
          <>
            {/* Gentle, neutral summary - a count, never a judgement. The
                number gets its own big display line instead of being
                embedded in a sentence - a long sentence set in the heading
                font was wrapping awkwardly ("squashed" per Richard). */}
            <View style={[styles.summaryCard, { backgroundColor: theme.surface + "E6", borderColor: theme.border }]}>
              <View style={styles.summaryTopRow}>
                <Text style={[styles.summaryNumber, { color: theme.primary }]}>{checkins.length}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                  check-in{checkins.length === 1 ? "" : "s"}{"\n"}in the last {range} days
                </Text>
              </View>
              <Text style={[styles.summaryKindNote, { color: theme.textMuted }]}>
                Every one of these is a moment you took for yourself.
              </Text>
            </View>

            <Pressable
              onPress={handleDownloadReport}
              disabled={downloading}
              style={[styles.exportRow, { borderColor: theme.border, backgroundColor: theme.surface + "E6", opacity: downloading ? 0.6 : 1 }]}
            >
              <View style={[styles.exportIconWrap, { backgroundColor: theme.primarySoft }]}>
                {downloading ? (
                  <ActivityIndicator color={theme.primary} size="small" />
                ) : (
                  <Ionicons name="download-outline" size={20} color={theme.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.primary, fontWeight: "600" }}>
                  {isPro ? "Download PDF report" : "Download PDF report (Pro)"}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                  Trends and charts live in your report - look when you choose to.
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setShowList((v) => !v)}
              style={[
                styles.disclosureRow,
                { borderColor: theme.border, backgroundColor: theme.surface + "E6", minHeight: theme.minTouchTarget },
              ]}
            >
              <Text style={{ color: theme.text, fontWeight: "600" }}>
                {showList
                  ? `Hide the ${weeklyBuckets ? "week-by-week summary" : "day-by-day list"}`
                  : `Show the ${weeklyBuckets ? "week-by-week summary" : "day-by-day list"}`}
              </Text>
              <Ionicons
                name={showList ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textMuted}
              />
            </Pressable>

            {showList && weeklyBuckets ? (
              <FlatList
                style={{ flex: 1 }}
                data={[...weeklyBuckets].reverse()}
                keyExtractor={(w) => w.label}
                contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.xl }}
                renderItem={({ item }) => (
                  <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface + "E6" }]}>
                    <Text style={{ color: theme.text, fontWeight: "600" }}>
                      {item.label} ({item.count} check-in{item.count === 1 ? "" : "s"})
                    </Text>
                    <Text style={{ color: theme.textMuted }}>
                      Pain {PAIN_LABELS[item.pain]} · Anxiety/PTSD {ANXIETY_LABELS[item.anxiety]} · Energy{" "}
                      {ENERGY_LABELS[item.energy]}
                    </Text>
                  </View>
                )}
              />
            ) : showList ? (
              <FlatList
                style={{ flex: 1 }}
                data={[...checkins].reverse()}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.xl }}
                renderItem={({ item }) => (
                  <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface + "E6" }]}>
                    <Text style={{ color: theme.text, fontWeight: "600" }}>{item.date}</Text>
                    <Text style={{ color: theme.textMuted }}>
                      Pain {item.pain_score} · Anxiety/PTSD {item.anxiety_score} · Energy {item.energy_score}
                    </Text>
                    {item.note ? <Text style={{ color: theme.textMuted, fontStyle: "italic" }}>{item.note}</Text> : null}
                  </View>
                )}
              />
            ) : (
              // flex: 1 (not a fixed height) is the actual fix for the hard
              // white rectangle Richard saw at the bottom of this screen:
              // with no flexible child anywhere in this column, Android
              // wasn't resolving the ScreenBackground photo to the screen's
              // real full height, so it hard-cropped a bit short and the
              // native white behind it showed through below the crop line.
              // A genuine flex:1 child forces the whole column - and the
              // photo behind it - to resolve to true full height. minHeight
              // keeps the disclosure row clear of the floating tab bar.
              <View style={{ flex: 1, minHeight: tabBarHeight + spacing.xl }} />
            )}
          </>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  // Was spacing.md/spacing.sm throughout below - everything sat right on
  // top of everything else. Richard's "cramped together" note, July 2026:
  // widened the gaps between title/chips/card/button/toggle.
  rangeScroll: { flexGrow: 0, marginBottom: spacing.lg },
  rangeRow: { flexDirection: "row", gap: spacing.sm, paddingRight: spacing.lg },
  rangeChip: {
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    justifyContent: "center",
    ...cardShadow,
  },
  summaryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  // Big-number treatment - was one long sentence set entirely in the
  // heading font, which wrapped awkwardly ("squashed", per Richard). The
  // count now reads like a real stat, the way Calm/Headspace-tier apps
  // present numbers, with the sentence broken out as a plain label beside it.
  summaryTopRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  summaryNumber: { fontSize: 52, fontFamily: fonts.heading, lineHeight: 52 },
  summaryLabel: { fontSize: fontSizes.label, marginBottom: 4, lineHeight: 18 },
  summaryKindNote: { marginTop: spacing.sm, fontSize: fontSizes.label },
  exportRow: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  exportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  disclosureRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    ...cardShadow,
  },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
});
