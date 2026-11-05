import { Feather } from "@react-native-vector-icons/feather";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { TwoPeople } from "@/src/components/Warm";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDuration } from "@/src/components/CallStats";
import { Btn, Header, IconBtn } from "@/src/components/ui";
import { clearHistory, getHistory, qualityLabel, RESULT_LABEL, type CallRecord } from "@/src/history";
import { getContacts, nameFor, type Contact } from "@/src/contacts";
import { getLang, tr, useLang } from "@/src/i18n";
import { FREE_HISTORY, useProState } from "@/src/pro";
import { colors, fonts, radius, spacing } from "@/src/theme";

const QUALITY_COLOR: Record<string, string> = { Buona: colors.success, Media: colors.warning, Debole: colors.error };

function when(at: number) {
  return new Date(at).toLocaleString(getLang() === "en" ? "en-GB" : "it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Row({ item, index, name }: { item: CallRecord; index: number; name?: string }) {
  const router = useRouter();
  const ok = item.result === "completata";
  const out = item.role === "out";
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(300)} style={styles.row} testID={`history-row-${item.id}`}>
      <View style={[styles.icon, { backgroundColor: ok ? colors.brandSecondary : colors.surfaceTertiary }]}>
        <Feather name={out ? "arrow-up-right" : "arrow-down-left"} size={20} color={ok ? colors.brandPrimary : colors.error} />
      </View>
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <Text style={styles.code} numberOfLines={1}>
            {name ?? item.code}
          </Text>
          {out && !name ? (
            <Pressable
              testID={`history-save-contact-${item.id}`}
              accessibilityLabel={tr("Salva in rubrica", "Save contact")}
              hitSlop={8}
              style={styles.saveBtn}
              onPress={() => router.push({ pathname: "/contacts", params: { code: item.code } })}
            >
              <Feather name="user-plus" size={18} color={colors.brandPrimary} />
            </Pressable>
          ) : null}
        </View>
        {name ? <Text style={styles.meta}>{item.code}</Text> : null}
        <Text style={styles.meta} numberOfLines={2}>
          {out ? tr("Trasmessa", "Outgoing") : tr("Ricevuta", "Incoming")} · {when(item.at)}
        </Text>
        <View style={styles.tags}>
          <Text style={[styles.result, { color: ok ? colors.onSurface : colors.error }]}>
            {ok ? formatDuration(item.duration) : RESULT_LABEL(item.result)}
          </Text>
          {item.quality ? (
            <View style={styles.qTag}>
              <View style={[styles.dot, { backgroundColor: QUALITY_COLOR[item.quality] ?? colors.muted }]} />
              <Text style={styles.qText}>{qualityLabel(item.quality)}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {out ? (
        <Pressable
          testID={`history-recall-${item.id}`}
          accessibilityLabel={tr(`Richiama ${item.code}`, `Call back ${item.code}`)}
          onPress={() => router.push({ pathname: "/sender", params: { code: item.code } })}
          style={({ pressed }) => [styles.recall, pressed && styles.pressed]}
        >
          <Feather name="phone-call" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.recallText}>{tr("Richiama", "Call back")}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export default function History() {
  useLang();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<CallRecord[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setItems);
      getContacts().then(setContacts);
    }, []),
  );

  const { pro } = useProState();
  const hidden = !pro && items ? Math.max(0, items.length - FREE_HISTORY) : 0;
  const shown = pro ? items : items?.slice(0, FREE_HISTORY);
  const total = items?.filter((i) => i.result === "completata").reduce((a, i) => a + i.duration, 0) ?? 0;

  return (
    <View style={styles.root} testID="history-screen">
      <Header
        title={tr("Storico chiamate", "Call history")}
        right={items && items.length > 0 ? <IconBtn icon="trash-2" label={tr("Cancella storico", "Clear history")} testID="history-clear-button" onPress={() => setConfirm(true)} /> : null}
      />
      {confirm && (
        <View style={styles.confirm} testID="history-clear-confirm">
          <Text style={styles.confirmText}>{tr("Cancellare tutto lo storico?", "Clear the whole history?")}</Text>
          <View style={styles.confirmRow}>
            <Btn compact testID="history-clear-cancel" label="No" onPress={() => setConfirm(false)} style={styles.flex} />
            <Btn
              compact
              testID="history-clear-yes"
              label={tr("Cancella", "Clear")}
              variant="danger"
              style={styles.flex}
              onPress={async () => {
                await clearHistory();
                setItems([]);
                setConfirm(false);
              }}
            />
          </View>
        </View>
      )}
      <FlatList
        testID="history-list"
        data={shown ?? []}
        ListFooterComponent={
          !pro && items && items.length > 0 ? (
            <Pressable testID="history-pro-banner" onPress={() => router.push("/pro")} style={({ pressed }) => [styles.proBanner, pressed && styles.pressed]}>
              <Feather name="lock" size={18} color={colors.brandPrimary} />
              <Text style={styles.proText}>
                {hidden > 0 ? tr(hidden === 1 ? "Un'altra chiamata nascosta. " : `Altre ${hidden} chiamate nascoste. `, hidden === 1 ? "1 more call hidden. " : `${hidden} more calls hidden. `) : ""}
                {tr("Con Pro vedi lo storico completo.", "Pro shows the full history.")}
              </Text>
              <Feather name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
          ) : undefined
        }
        keyExtractor={(i) => i.id}
        renderItem={({ item, index }) => <Row item={item} index={index} name={nameFor(contacts, item.code)} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        ListHeaderComponent={
          items && items.length > 0 ? (
            <Text style={styles.summary} testID="history-summary">
              {tr(`${items.length} ${items.length === 1 ? "chiamata" : "chiamate"} · ${formatDuration(total)} in 3D`, `${items.length} ${items.length === 1 ? "call" : "calls"} · ${formatDuration(total)} in 3D`)}
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          items ? (
            <View style={styles.empty} testID="history-empty">
              <TwoPeople size={140} />
              <Text style={styles.emptyTitle}>{tr("Nessuna chiamata per ora", "No calls yet")}</Text>
              <Text style={styles.emptyText}>{tr("Le chiamate fatte e ricevute compariranno qui, con durata e qualità.", "Calls you make and receive will appear here, with duration and quality.")}</Text>
              <Btn testID="history-empty-call-button" label={tr("Fai una chiamata", "Make a call")} icon="video" variant="primary" onPress={() => router.replace("/sender")} />
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, flexGrow: 1 },
  summary: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginBottom: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  code: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 20, letterSpacing: 1, color: colors.onSurface },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  saveBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginVertical: -spacing.md },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  tags: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  result: { fontFamily: fonts.bold, fontSize: 14 },
  qTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  qText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  recall: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  recallText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onBrandPrimary },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  proBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brandPrimary, backgroundColor: colors.surfaceTertiary },
  proText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.onSurface },
  confirm: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, gap: spacing.sm },
  confirmText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  confirmRow: { flexDirection: "row", gap: spacing.sm },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 21 },
});
