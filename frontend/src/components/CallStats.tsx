import { Feather } from "@react-native-vector-icons/feather";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, spacing } from "@/src/theme";

export type CallStatsData = { kbps: number; fps: number; w: number; h: number; rtt: number | null; loss: number };

type Quality = { label: string; color: string; on: string; bars: number };

export function quality(s: CallStatsData | null): Quality {
  if (!s) return { label: "Misuro…", color: colors.brandSecondary, on: colors.onBrandSecondary, bars: 0 };
  const rtt = s.rtt ?? 0;
  if (s.loss < 2 && rtt < 150 && s.fps >= 18) return { label: "Buona", color: colors.success, on: colors.onSuccess, bars: 3 };
  if (s.loss < 8 && rtt < 400 && s.fps >= 10) return { label: "Media", color: colors.warning, on: colors.onWarning, bars: 2 };
  return { label: "Debole", color: colors.error, on: colors.onError, bars: 1 };
}

export function formatDuration(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt ? now - startedAt : 0;
}

function Bars({ n, color }: { n: number; color: string }) {
  return (
    <View style={styles.bars}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.bar, { height: 4 + i * 3, backgroundColor: i <= n ? color : colors.border }]} />
      ))}
    </View>
  );
}

/** Small pill: timer + quality, for overlays on the video. */
export function CallPill({ startedAt, stats, testID }: { startedAt: number; stats: CallStatsData | null; testID: string }) {
  const elapsed = useElapsed(startedAt);
  const q = quality(stats);
  return (
    <View style={styles.pill} testID={testID}>
      <Feather name="clock" size={14} color={colors.onSurface} />
      <Text style={styles.pillTime} testID={`${testID}-time`}>
        {formatDuration(elapsed)}
      </Text>
      <Bars n={q.bars} color={q.color} />
    </View>
  );
}

/** Card with timer, quality and technical details. */
export function CallStatsCard({ startedAt, stats, testID, direction }: { startedAt: number; stats: CallStatsData | null; testID: string; direction: "in" | "out" }) {
  const elapsed = useElapsed(startedAt);
  const q = quality(stats);
  const mbps = stats ? (stats.kbps / 1000).toFixed(1) : "–";
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.caption}>Durata chiamata</Text>
          <Text style={styles.time} testID={`${testID}-time`}>
            {formatDuration(elapsed)}
          </Text>
        </View>
        <View style={[styles.quality, { backgroundColor: q.color }]} testID={`${testID}-quality`}>
          <Feather name="wifi" size={16} color={q.on} />
          <Text style={[styles.qualityText, { color: q.on }]}>{q.label}</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <Metric label={direction === "in" ? "Ricevo" : "Invio"} value={`${mbps} Mbit/s`} testID={`${testID}-bitrate`} />
        <Metric label="Fotogrammi" value={stats ? `${stats.fps} fps` : "–"} testID={`${testID}-fps`} />
        <Metric label="Ritardo" value={stats?.rtt != null ? `${stats.rtt} ms` : "–"} testID={`${testID}-rtt`} />
        <Metric label="Persi" value={stats ? `${stats.loss}%` : "–"} testID={`${testID}-loss`} />
      </View>
      {stats && stats.w > 0 ? <Text style={styles.res}>Video {stats.w} × {stats.h}</Text> : null}
    </View>
  );
}

function Metric({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} testID={testID} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.scrim,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 32,
  },
  pillTime: { fontFamily: fonts.bold, fontSize: 14, color: colors.onSurface, fontVariant: ["tabular-nums"], marginRight: spacing.xs },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  bar: { width: 4, borderRadius: 1 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  caption: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  time: { fontFamily: fonts.bold, fontSize: 28, color: colors.onSurface, fontVariant: ["tabular-nums"] },
  quality: { flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 36 },
  qualityText: { fontFamily: fonts.bold, fontSize: 15 },
  metrics: { flexDirection: "row", marginTop: spacing.sm, gap: spacing.sm },
  metric: { flex: 1 },
  metricLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  metricValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.onSurface },
  res: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: spacing.xs },
});
