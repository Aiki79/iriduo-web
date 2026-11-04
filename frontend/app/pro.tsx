import { Feather } from "@react-native-vector-icons/feather";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, Header } from "@/src/components/ui";
import { activatePro, callsLeft, deactivatePro, FREE_HD_CALLS, PLANS, useProState, type Plan } from "@/src/pro";
import { colors, fonts, radius, spacing } from "@/src/theme";

const FEATURES: { icon: "monitor" | "clock" | "heart" | "camera" | "phone-call"; free: string; pro: string }[] = [
  { icon: "phone-call", free: `${FREE_HD_CALLS} chiamate al mese`, pro: "Chiamate illimitate" },
  { icon: "monitor", free: "Solo qualità HD", pro: "Qualità 4K e 2,9K" },
  { icon: "clock", free: "Storico: ultime 3 chiamate", pro: "Storico completo" },
  { icon: "heart", free: "3 reazioni", pro: "Tutte le reazioni" },
  { icon: "camera", free: "Niente foto 3D né registrazioni", pro: "Foto 3D e registrazioni" },
];

export default function ProScreen() {
  const insets = useSafeAreaInsets();
  const s = useProState();
  const [plan, setPlan] = useState<Plan>("annual");
  const [confirm, setConfirm] = useState(false);

  return (
    <View style={styles.root} testID="pro-screen">
      <Header title="IriDuo Pro" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.demo} testID="pro-demo-banner">
          <Feather name="info" size={18} color={colors.warning} />
          <Text style={styles.demoText}>Modalità prova: nessun pagamento reale. Il Pro si attiva solo su questo telefono, per vedere come funziona.</Text>
        </View>

        {s.pro ? (
          <View style={styles.active} testID="pro-active">
            <Feather name="check-circle" size={28} color={colors.success} />
            <Text style={styles.activeTitle}>Pro attivo (prova)</Text>
            <Text style={styles.activeText}>Piano {s.plan === "annual" ? "annuale · 59,99 € / anno" : "mensile · 6,99 € / mese"}</Text>
          </View>
        ) : (
          <Text style={styles.left} testID="pro-calls-left">
            Ti restano {callsLeft(s)} chiamate gratuite questo mese.
          </Text>
        )}

        <View style={styles.table}>
          <View style={styles.tRow}>
            <Text style={[styles.tHead, styles.flex]}>Gratis</Text>
            <Text style={[styles.tHead, styles.flex, styles.proHead]}>Pro</Text>
          </View>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.tRow}>
              <Text style={[styles.tCell, styles.flex]}>{f.free}</Text>
              <View style={[styles.flex, styles.proCell]}>
                <Feather name={f.icon} size={16} color={colors.brandPrimary} />
                <Text style={styles.tCellPro}>{f.pro}</Text>
              </View>
            </View>
          ))}
        </View>

        {!s.pro &&
          PLANS.map((p) => (
            <Pressable
              key={p.id}
              testID={`pro-plan-${p.id}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: plan === p.id }}
              onPress={() => setPlan(p.id)}
              style={({ pressed }) => [styles.plan, plan === p.id && styles.planOn, pressed && styles.pressed]}
            >
              <Feather name={plan === p.id ? "check-circle" : "circle"} size={22} color={plan === p.id ? colors.brandPrimary : colors.muted} />
              <View style={styles.flex}>
                <Text style={styles.planLabel}>{p.label}</Text>
                <Text style={styles.planNote}>{p.note}</Text>
              </View>
              <Text style={styles.planPrice}>{p.price}</Text>
            </Pressable>
          ))}

        {s.pro ? (
          <Btn testID="pro-deactivate-button" label="Torna al piano gratuito" icon="x-circle" onPress={deactivatePro} />
        ) : confirm ? (
          <View style={styles.confirm} testID="pro-confirm">
            <Text style={styles.confirmText}>Attivare il Pro in prova? Non viene addebitato nulla.</Text>
            <View style={styles.row}>
              <Btn compact testID="pro-confirm-cancel" label="Annulla" onPress={() => setConfirm(false)} style={styles.flex} />
              <Btn
                compact
                testID="pro-confirm-yes"
                label="Attiva"
                variant="primary"
                style={styles.flex}
                onPress={() => {
                  activatePro(plan);
                  setConfirm(false);
                }}
              />
            </View>
          </View>
        ) : (
          <Btn testID="pro-activate-button" label="Prova il Pro" icon="star" variant="primary" onPress={() => setConfirm(true)} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: spacing.sm },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  demo: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.warningSurface, borderRadius: radius.md, padding: spacing.md },
  demoText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.warning },
  active: { alignItems: "center", gap: spacing.xs, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.success, padding: spacing.lg },
  activeTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.onSurface },
  activeText: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  left: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  table: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  tRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tHead: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: colors.muted },
  proHead: { color: colors.brandPrimary },
  tCell: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.muted },
  proCell: { flexDirection: "row", gap: spacing.xs, alignItems: "flex-start" },
  tCellPro: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.onSurface },
  plan: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  planOn: { borderColor: colors.brandPrimary, borderWidth: 2 },
  planLabel: { fontFamily: fonts.bold, fontSize: 17, color: colors.onSurface },
  planNote: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  planPrice: { fontFamily: fonts.bold, fontSize: 16, color: colors.brandPrimary },
  confirm: { gap: spacing.sm, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: spacing.md },
  confirmText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onSurface },
  pressed: { opacity: 0.85 },
});
