import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Share, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Svg, { Polyline, Line } from "react-native-svg";
import { useAppTheme } from "@/context/ThemeContext";
import { usePro, FREE_HISTORY_RANGES, PRO_ONLY_HISTORY_RANGES } from "@/context/ProContext";
import { useBackgroundPrefs } from "@/context/BackgroundPrefsContext";
import { ScreenBackground } from "@/components/ScreenBackground";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes, radii, imageTextShadow, fonts } from "@/lib/theme";

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
// optionally to show a GP/therapist. 90-day range and report export are
// Pro (Section: Pro tier, July 2026) - everything else here stays free.
export function HistoryScreen() {
  const { theme } = useAppTheme();
  const { isPro } = usePro();
  const { getSource } = useBackgroundPrefs();
  const navigation = useNavigation<any>();
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [checkins, setCheckins] = useState<Checkin[]>([]);

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
    const toPoints = (key: keyof Checkin) =>
      checkins
        .map((c, i) => {
          const x = (i / Math.max(n - 1, 1)) * w;
          const y = h - ((c[key] as number) / 4) * h;
          return `${x},${y}`;
        })
        .join(" ");
    return {
      pain: toPoints("pain_score"),
      anxiety: toPoints("anxiety_score"),
      energy: toPoints("energy_score"),
      w,
      h,
    };
  }, [checkins]);

  const selectRange = (r: (typeof RANGES)[number]) => {
    const isProOnly = (PRO_ONLY_HISTORY_RANGES as readonly number[]).includes(r);
    if (isProOnly && !isPro) {
      navigation.navigate("Upgrade");
      return;
    }
    setRange(r);
  };

  const handleExport = async () => {
    if (!isPro) {
      navigation.navigate("Upgrade");
      return;
    }
    if (checkins.length === 0) {
      Alert.alert("Nothing to export yet", "Log a few check-ins first.");
      return;
    }
    const header = "Date,Pain,Anxiety,Energy,Note";
    const rows = checkins.map(
      (c) => `${c.date},${c.pain_score},${c.anxiety_score},${c.energy_score},"${(c.note ?? "").replace(/"/g, "'")}"`
    );
    const csv = [header, ...rows].join("\n");
    try {
      await Share.share({
        title: "Quiet Signal history report",
        message: `Quiet Signal check-in history (${range} days)\n\n${csv}`,
      });
    } catch {
      // user cancelled the share sheet - nothing to do
    }
  };

  return (
    <ScreenBackground source={getSource("history")}>
      <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }, imageTextShadow]}>History</Text>

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

      <Pressable onPress={handleExport} style={[styles.exportRow, { borderColor: theme.border, backgroundColor: theme.surface + "D9" }]}>
        <Text style={{ color: theme.primary, fontWeight: "600" }}>
          {isPro ? "Export report" : "Export report (Pro)"}
        </Text>
      </Pressable>

      {checkins.length === 0 ? (
        <Text style={[{ color: theme.textMuted, padding: spacing.lg }, imageTextShadow]}>No check-ins in this range yet.</Text>
      ) : (
        <>
          <Svg width={trendPoints.w} height={trendPoints.h + 10} style={{ alignSelf: "center", marginBottom: spacing.md }}>
            <Line x1={0} y1={trendPoints.h} x2={trendPoints.w} y2={trendPoints.h} stroke={theme.border} strokeWidth={1} />
            <Polyline points={trendPoints.pain} fill="none" stroke={theme.danger} strokeWidth={2} />
            <Polyline points={trendPoints.anxiety} fill="none" stroke={theme.primary} strokeWidth={2} />
            <Polyline points={trendPoints.energy} fill="none" stroke={theme.success} strokeWidth={2} />
          </Svg>
          <View style={styles.legendRow}>
            <LegendDot color={theme.danger} label="Pain" textColor={theme.text} />
            <LegendDot color={theme.primary} label="Anxiety" textColor={theme.text} />
            <LegendDot color={theme.success} label="Energy" textColor={theme.text} />
          </View>

          <FlatList
            data={[...checkins].reverse()}
            keyExtractor={(c) => c.id}
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
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading, marginBottom: spacing.md },
  rangeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  rangeChip: { paddingHorizontal: spacing.md, borderRadius: 20, justifyContent: "center" },
  exportRow: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  legendRow: { flexDirection: "row", justifyContent: "center", marginBottom: spacing.md },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
});
