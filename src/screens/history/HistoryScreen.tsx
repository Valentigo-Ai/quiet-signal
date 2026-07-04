import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Svg, { Polyline, Line, Circle } from "react-native-svg";
import { useAppTheme } from "@/context/ThemeContext";
import { usePro, FREE_HISTORY_RANGES, PRO_ONLY_HISTORY_RANGES } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TextOnPhoto } from "@/components/TextOnPhoto";
import { supabase } from "@/lib/supabase";
import { downloadCheckinPdfReport } from "@/lib/pdfReport";
import { spacing, fontSizes, radii, fonts } from "@/lib/theme";

// Minimum check-ins before a "trend" line is shown at all. Two points
// always look like a confident straight-line trend even when they're just
// noise - misleading for something as personal as pain/anxiety/energy. Below
// this the screen just shows the daily list, which is honest at any amount
// of data.
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

// Section 4.4 - calendar/list view + simple trend lines. Private to the
// user unless explicitly shared elsewhere; purpose is spotting patterns,
// optionally to show to whoever the user chooses. 90-day range and PDF
// report export are Pro (Section: Pro tier, July 2026) - everything else
// here stays free.
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

  const trendPoints = useMemo(() => {
    const w = 300;
    const h = 80;
    const n = Math.max(checkins.length, 1);
    const toXY = (key: keyof Checkin) =>
      checkins.map((c, i) => ({
        x: (i / Math.max(n - 1, 1)) * w,
        y: h - ((c[key] as number) / 4) * h,
      }));
    const toPolyline = (points: { x: number; y: number }[]) => points.map((p) => `${p.x},${p.y}`).join(" ");
    const painXY = toXY("pain_score");
    const anxietyXY = toXY("anxiety_score");
    const energyXY = toXY("energy_score");
    return {
      pain: toPolyline(painXY),
      anxiety: toPolyline(anxietyXY),
      energy: toPolyline(energyXY),
      painXY,
      anxietyXY,
      energyXY,
      w,
      h,
    };
  }, [checkins]);

  // Plain-language readout above the chart. A line graph asks the viewer to
  // do visual-comparison work (compare heights, notice slope direction) that
  // isn't reliable for everyone, especially on a day where pain or anxiety
  // is already high - a sentence says the same thing without that step.
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

  // Builds the actual text that lands in whatever app the person picks from
  // the OS share sheet (Messages, WhatsApp, etc). This used to be a raw CSV
  // dump (Date,Pain,Anxiety,Energy,Note) pasted straight into the message
  // body - fine as a file, unreadable as a text: someone opening WhatsApp
  // and seeing a header row and comma-separated numbers has no idea what
  // they're looking at. This reuses the same plain-language trend sentence
  // already shown on-screen so the export says the same thing a human
  // would say out loud, not what a spreadsheet would.
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

  // Downloads an actual PDF (via expo-print) rather than pasting the
  // summary into a text message - deliberately framed as "download a
  // report" rather than "for your doctor": the content is the same
  // self-reported, plain-language summary either way, but naming it for a
  // specific clinical audience invited more scrutiny than the feature
  // itself warrants. The share sheet this opens still covers email, Files,
  // WhatsApp, printing, or just saving it - whoever the person wants to
  // show it to, doctor or otherwise.
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
              <Text style={{ color: range === r ? "#FFF" : theme.text }}>
                {r} days{locked ? " 🔒" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={handleDownloadReport}
        disabled={downloading}
        style={[styles.exportRow, { borderColor: theme.border, backgroundColor: theme.surface + "D9", opacity: downloading ? 0.6 : 1 }]}
      >
        {downloading ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <Text style={{ color: theme.primary, fontWeight: "600" }}>
            {isPro ? "Download PDF report" : "Download PDF report (Pro)"}
          </Text>
        )}
      </Pressable>

      {checkins.length === 0 ? (
        <TextOnPhoto style={{ margin: spacing.lg, alignSelf: "flex-start" }}>
          <Text style={{ color: theme.textMuted }}>No check-ins in this range yet.</Text>
        </TextOnPhoto>
      ) : (
        <>
          {checkins.length < MIN_POINTS_FOR_TREND ? (
            <TextOnPhoto style={{ marginBottom: spacing.md, alignSelf: "flex-start" }}>
              <Text style={{ color: theme.textMuted }}>
                Log a few more days to see a trend - {MIN_POINTS_FOR_TREND - checkins.length} more and it'll show up
                here.
              </Text>
            </TextOnPhoto>
          ) : (
            <>
              {trendSummary && (
                <TextOnPhoto style={{ marginBottom: spacing.md, alignSelf: "flex-start" }}>
                  <Text style={{ color: theme.text }}>{trendSummary}</Text>
                </TextOnPhoto>
              )}
              <View style={{ alignSelf: "center", marginBottom: spacing.xs }}>
                <Svg width={trendPoints.w} height={trendPoints.h + 10}>
                  <Line x1={0} y1={trendPoints.h} x2={trendPoints.w} y2={trendPoints.h} stroke={theme.border} strokeWidth={1} />
                  {/* Distinct dash patterns per line, not just color - when two
                      metrics have the same score on the same day (common for
                      pain/anxiety), their lines land on identical pixels and
                      whichever is drawn last used to hide the other
                      completely. Solid/dashed/dotted stays visible either way. */}
                  <Polyline points={trendPoints.pain} fill="none" stroke={theme.danger} strokeWidth={2} />
                  <Polyline
                    points={trendPoints.anxiety}
                    fill="none"
                    stroke={theme.primary}
                    strokeWidth={2}
                    strokeDasharray="6,4"
                  />
                  <Polyline
                    points={trendPoints.energy}
                    fill="none"
                    stroke={theme.success}
                    strokeWidth={2}
                    strokeDasharray="1,4"
                    strokeLinecap="round"
                  />
                  {trendPoints.painXY.map((p, i) => (
                    <Circle key={`pain-${i}`} cx={p.x} cy={p.y} r={3} fill={theme.danger} />
                  ))}
                  {trendPoints.anxietyXY.map((p, i) => (
                    <Circle key={`anxiety-${i}`} cx={p.x} cy={p.y} r={3} fill={theme.primary} />
                  ))}
                  {trendPoints.energyXY.map((p, i) => (
                    <Circle key={`energy-${i}`} cx={p.x} cy={p.y} r={3} fill={theme.success} />
                  ))}
                </Svg>
                <View style={styles.axisRow}>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>{checkins[0].date}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                    {checkins[checkins.length - 1].date}
                  </Text>
                </View>
                <Text style={{ color: theme.textMuted, fontSize: 11, textAlign: "center", marginTop: 2 }}>
                  Top of chart = higher score (0-4 scale) · bottom = lower
                </Text>
              </View>
              <View style={styles.legendRow}>
                <LegendDot color={theme.danger} label="Pain (solid)" textColor={theme.text} />
                <LegendDot color={theme.primary} label="Anxiety (dashed)" textColor={theme.text} />
                <LegendDot color={theme.success} label="Energy (dotted)" textColor={theme.text} />
              </View>
            </>
          )}

          <FlatList
            data={[...checkins].reverse()}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.lg }}
            renderItem={({ item }) => (
              <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface + "D9" }]}>
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

function LegendDot({ color, label, textColor }: { color: string; label: string; textColor: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginRight: spacing.md }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ color: textColor, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading },
  rangeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  rangeChip: { paddingHorizontal: spacing.md, borderRadius: 20, justifyContent: "center" },
  exportRow: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  legendRow: { flexDirection: "row", justifyContent: "center", marginBottom: spacing.md, flexWrap: "wrap" },
  axisRow: { flexDirection: "row", justifyContent: "space-between", width: 300, alignSelf: "center" },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
});
