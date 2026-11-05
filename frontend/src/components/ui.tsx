import { Feather } from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, spacing } from "@/src/theme";

export type IconName = ComponentProps<typeof Feather>["name"];

type BtnProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "danger" | "secondary" | "success";
  disabled?: boolean;
  testID: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function Btn({ label, onPress, icon, variant = "secondary", disabled, testID, style, compact }: BtnProps) {
  const bg = {
    primary: colors.brandPrimary,
    danger: colors.error,
    success: colors.success,
    secondary: colors.surfaceSecondary,
  }[variant];
  const fg = {
    primary: colors.onBrandPrimary,
    danger: colors.onError,
    success: colors.onSuccess,
    secondary: colors.onSurfaceSecondary,
  }[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        { backgroundColor: bg, borderColor: variant === "secondary" ? colors.border : bg },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={20} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconBtn({ icon, onPress, testID, label }: { icon: IconName; onPress: () => void; testID: string; label: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    >
      <Feather name={icon} size={22} color={colors.onSurfaceSecondary} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, testID, icon, wide }: { label: string; selected: boolean; onPress: () => void; testID: string; icon?: IconName; wide?: boolean }) {
  const { width } = useWindowDimensions();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        wide && styles.chipWide,
        { backgroundColor: selected ? colors.brandPrimary : colors.surfaceSecondary, borderColor: selected ? colors.brandPrimary : colors.border },
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Feather name={icon} size={16} color={selected ? colors.onBrandPrimary : colors.muted} /> : null}
      <Text
        style={[styles.chipText, wide && { maxWidth: Math.min(400, width - 96) }, { color: selected ? colors.onBrandPrimary : colors.onSurfaceSecondary }]}
        numberOfLines={wide ? 2 : 1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <ScrollView testID={testID} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipRowWrap}>
      {children}
    </ScrollView>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function StatusBox({ text, tone = "info", testID }: { text: string; tone?: "info" | "error" | "success" | "warning"; testID: string }) {
  const accent = { info: colors.brandPrimary, error: colors.error, success: colors.success, warning: colors.warning }[tone];
  return (
    <View testID={testID} style={[styles.status, { borderLeftColor: accent }, tone === "warning" && { backgroundColor: colors.warningSurface }]}>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

export function Header({ title, right }: { title: string; right?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <IconBtn icon="arrow-left" label="Indietro" testID="header-back-button" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function Toggle({ label, value, onChange, testID, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; testID: string; hint?: string }) {
  return (
    <Pressable testID={testID} onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}>
      <View style={styles.flex}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
      </View>
      <View style={[styles.track, { backgroundColor: value ? colors.brandPrimary : colors.brandSecondary }]}>
        <View style={[styles.thumb, value ? styles.thumbOn : null]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  btn: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  btnCompact: { minHeight: 48, paddingHorizontal: spacing.lg },
  btnText: { fontFamily: fonts.bold, fontSize: 18 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.45 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRowWrap: { flexGrow: 0, height: 56 },
  chipRow: { gap: spacing.sm, alignItems: "center", paddingRight: spacing.lg },
  chip: {
    height: 44,
    flexShrink: 0,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 15, maxWidth: 220 },
  chipWide: { height: undefined, minHeight: 44, paddingVertical: 4 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.xs, letterSpacing: 0.6, textTransform: "uppercase" },
  status: {
    backgroundColor: colors.surfaceSecondary,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statusText: { fontFamily: fonts.regular, fontSize: 16, color: colors.onSurface, lineHeight: 22 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 24, color: colors.onSurface },
  headerRight: { flexDirection: "row", gap: spacing.sm },
  toggleRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  toggleLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  toggleHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  track: { width: 52, height: 30, borderRadius: radius.pill, padding: 3, justifyContent: "center" },
  thumb: { width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.onSurface },
  thumbOn: { alignSelf: "flex-end", backgroundColor: colors.onBrandPrimary },
});
