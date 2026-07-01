import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Polyline, Line } from "react-native-svg";
import { useAppTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { spacing, fontSizes } from "@/lib/theme";

type Checkin = {
  id: string;
  date: string;
  pain_score: number;
  anxiety_score: number;
  energy_score: number;
  note: string | null;
};

const RANGES = [7, 30, 90] as const;

// Section 4.4 - calendar/list view + simple trend lines. Private to the
// user unless explicitly shared elsewhere; purpose is spotting patterns,
// optionally to show a GP/therapist.
export function HistoryScreen() {
  const { theme } = useAppTheme();
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>History</Text>

      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={[
              styles.rangeChip,
              { backgroundColor: range === r ? theme.primary : theme.primarySoft, minHeight: theme.minTouchTarget },
            ]}
          >
            <Text style={{ color: range === r ? "#FFF" : theme.text }}>{r} days</Text>
          </Pressable>
        ))}
      </View>

      {checkins.length === 0 ? (
        <Text style={{ color: theme.textMuted, padding: spacing.lg }}>No check-ins in this range yet.</Text>
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
              <View style={[styles.row, { borderColor: theme.border }]}>
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
    </SafeAreaView>
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
  title: { fontSize: fontSizes.title, fontWeight: "700", marginBottom: spacing.md },
  rangeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  rangeChip: { paddingHorizontal: spacing.md, borderRadius: 20, justifyContent: "center" },
  legendRow: { flexDirection: "row", justifyContent: "center", marginBottom: spacing.md },
  row: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
