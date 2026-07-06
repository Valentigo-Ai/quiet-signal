import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useAppTheme } from "@/context/ThemeContext";
import { usePro, FREE_HISTORY_RANGES, PRO_ONLY_HISTORY_RANGES } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { supabase } from "@/lib/supabase";
import { downloadCheckinPdfReport } from "@/lib/pdfReport";
import { spacing, fontSizes, radii, fonts } from "@/lib/theme";

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
  // (see the product note above the component).
  const trendSummary = useMemo(() => {
    if (checkins.length < MIN_POINTS_FOR_TREND) return null;
    const first = checkins[0];
    const last = checkins[checkins.length - 1];
    const parts: string[] = [];
    const pain = describeTrend(first.pain_score, last.pain_score);
    const anxiety = describeTrend(first.anxiety_score, last.anxiety_score);
    const energy = describeTrend(first.energy_score, last.energy_score);
    const phrase = (label: string, dir: "up" | "down" | "steady") =>
      dir === "steady" ? `${label} stayed about the same` : `${label} trended ${dir}`;
    parts.push(phrase("pain", pain));
    parts.push(phrase("anxiety", anxiety));
    parts.push(phrase("energy", energy));
    return `Over this period: ${parts.join(", ")}.`;
  }, [checkins]);

  const selectRange = (r: (typeof RANGES)[number]) => {
    const isProOnly = (PRO_ONLY_HISTORY_RANGES as readonly number[]).includes(r);
    if (isProOnly && !isPro) {
      navigation.navigate("Upgrade");
      return;
    }
    setRange(r);
  };

  // Builds the text that lands in the PDF report. Reuses the same
  // plain-language trend sentence so the report says what a human would say
  // out loud, not what a spreadsheet would.
  const buildShareSummary = () => {
    const first = checkins[0];
    const last = checkins[checkins.length - 1];
    const count = checkins.length;
    const rangeLabel = count === 1 ? `on ${first.date}` : `between ${first.date} and ${last.date}`;

    const lines: string[] = [];
    lines.push(`Quiet Signal check-in summary - last ${range} days`);
    lines.push(`${count} check-in${count === 1 ? "" : "s"} logged ${rangeLabel}.`);
    lines.push("");

    if (trendSummary) {
      lines.push(trendSummary);
    } else {
      lines.push(
        `Only ${count} check-in${count === 1 ? "" : "s"} in this period - not quite enough yet to show a trend.`
      );
    }

    lines.push("");
    lines.push(
      `Most recent, ${last.date}: pain ${last.pain_score} out of 4, anxiety ${last.anxiety_score} out of 4, energy ${last.energy_score} out of 4.`
    );

    lines.push("");
    lines.push("Sent from Quiet Signal - a personal check-in, not a diagnosis.");

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
      await downloadCheckinPdfReport({
        rangeLabel: `Last ${range} days`,
        summaryText: buildShareSummary(),
        rows: checkins,
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

        <View style={styles.rangeRow}>
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
        </View>

        {checkins.length === 0 ? (
          <TextOnPhoto style={{ margin: spacing.lg, alignSelf: "flex-start" }}>
            <Text style={{ color: theme.textMuted }}>No check-ins in this range yet.</Text>
          </TextOnPhoto>
        ) : (
          <>
            {/* Gentle, neutral summary - a count, never a judgement. */}
            <View style={[styles.summaryCard, { backgroundColor: theme.surface + "E6", borderColor: theme.border }]}>
              <Text style={[styles.summaryCount, { color: theme.text }]}>
                {checkins.length} check-in{checkins.length === 1 ? "" : "s"} in the last {range} days
              </Text>
              <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                Every one of these is a moment you took for yourself.
              </Text>
            </View>

            <Pressable
              onPress={handleDownloadReport}
              disabled={downloading}
              style={[styles.exportRow, { borderColor: theme.border, backgroundColor: theme.surface + "E6", opacity: downloading ? 0.6 : 1 }]}
            >
              {downloading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <>
                  <Text style={{ color: theme.primary, fontWeight: "600" }}>
                    {isPro ? "Download PDF report" : "Download PDF report (Pro)"}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                    Trends and charts live in your report - look when you choose to.
                  </Text>
                </>
              )}
            </Pressable>

            <FlatList
              data={[...checkins].reverse()}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.lg }}
              renderItem={({ item }) => (
                <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface + "E6" }]}>
                  <Text style={{ color: theme.text, fontWeight: "600" }}>{item.date}</Text>
                  <Text style={{ color: theme.textMuted }}>
                    Pain {item.pain_score} · Anxiety {item.anxiety_score} · Energy {item.energy_score}
                  </Text>
                  {item.note ? <Text style={{ color: theme.textMuted, fontStyle: "italic" }}>{item.note}</Text> : null}
                </View>
              )}
            />
          </>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  rangeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  rangeChip: { paddingHorizontal: spacing.md, borderRadius: 20, justifyContent: "center" },
  summaryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCount: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  exportRow: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
});
