import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState, type ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { tr } from "@/src/i18n";
import { colors, radius, spacing } from "@/src/theme";

type MdiName = ComponentProps<typeof MaterialDesignIcons>["name"];

// Reaction colors are fixed (they mean the same thing in every theme)
export const REACTIONS: { kind: string; icon: MdiName; color: string; label: [string, string] }[] = [
  { kind: "heart", icon: "heart", color: "#E0605C", label: ["Cuore", "Heart"] },
  { kind: "clap", icon: "hand-clap", color: "#E0A85C", label: ["Applauso", "Applause"] },
  { kind: "star", icon: "star", color: "#F2D15C", label: ["Stella", "Star"] },
  { kind: "like", icon: "thumb-up", color: "#5CC8E0", label: ["Mi piace", "Like"] },
  { kind: "wow", icon: "emoticon-excited", color: "#5CE093", label: ["Wow", "Wow"] },
];

export type FloatingReaction = { id: string; kind: string };

export const newReaction = (kind: string): FloatingReaction => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind });

/** `unlocked` = how many reactions are free; the rest show a lock and call `onLocked`. */
export function ReactionBar({ onReact, testID, compact, unlocked = REACTIONS.length, onLocked }: { onReact: (kind: string) => void; testID: string; compact?: boolean; unlocked?: number; onLocked?: () => void }) {
  const size = compact ? 44 : 52;
  return (
    <View style={styles.bar} testID={testID}>
      {REACTIONS.map((r, i) => {
        const locked = i >= unlocked;
        return (
          <Pressable
            key={r.kind}
            testID={`${testID}-${r.kind}${locked ? "-locked" : ""}`}
            accessibilityRole="button"
            accessibilityLabel={locked ? tr(`${r.label[0]}: disponibile con Pro`, `${r.label[1]}: available with Pro`) : tr(`Invia reazione: ${r.label[0]}`, `Send reaction: ${r.label[1]}`)}
            onPress={() => {
              if (locked) return onLocked?.();
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onReact(r.kind);
            }}
            style={({ pressed }) => [styles.btn, { width: size, height: size }, compact && styles.btnCompact, locked && styles.locked, pressed && styles.pressed]}
          >
            <MaterialDesignIcons name={r.icon} size={compact ? 22 : 26} color={r.color} />
            {locked ? (
              <View style={styles.lock}>
                <MaterialDesignIcons name="lock" size={12} color={colors.onSurface} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Floater({ item, onDone }: { item: FloatingReaction; onDone: (id: string) => void }) {
  const r = REACTIONS.find((x) => x.kind === item.kind) ?? REACTIONS[0];
  const [left] = useState(() => 15 + Math.random() * 70);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) });
    const t = setTimeout(() => onDone(item.id), 2500);
    return () => clearTimeout(t);
  }, [item.id, onDone, p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.7 ? 1 : 1 - (p.value - 0.7) / 0.3,
    transform: [{ translateY: -p.value * 140 }, { scale: p.value < 0.1 ? 0.5 + p.value * 5 : 1 }],
  }));
  return (
    <Animated.View style={[styles.floater, { left: `${left}%` }, style]}>
      <MaterialDesignIcons name={r.icon} size={34} color={r.color} />
    </Animated.View>
  );
}

/** Reactions floating up over a 2D preview (used on the sender, whose preview is not a 3D scene). */
export function FloatingReactions({ items, onDone, testID }: { items: FloatingReaction[]; onDone: (id: string) => void; testID: string }) {
  if (items.length === 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={testID}>
      {items.map((i) => (
        <Floater key={i.id} item={i} onDone={onDone} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  btn: {
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCompact: { backgroundColor: colors.scrim },
  locked: { opacity: 0.55 },
  lock: { position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  pressed: { transform: [{ scale: 0.88 }], borderColor: colors.brandPrimary },
  floater: { position: "absolute", bottom: spacing.sm, marginLeft: -17 },
});
