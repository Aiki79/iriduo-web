import { Feather } from "@react-native-vector-icons/feather";
import { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Btn } from "@/src/components/ui";
import type { StageEvent } from "@/src/components/stage-types";
import { tr } from "@/src/i18n";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const REASONS = (): { id: string; label: string }[] => [
  { id: "molestie", label: tr("Molestie o insulti", "Harassment or insults") },
  { id: "sessuale", label: tr("Contenuti sessuali", "Sexual content") },
  { id: "minore", label: tr("Sembra un minorenne", "Seems to be a minor") },
  { id: "spam", label: tr("Spam o truffa", "Spam or scam") },
  { id: "altro", label: tr("Altro", "Other") },
];

const BLOCKED_KEY = "blocked_codes";
export async function blockedCodes(): Promise<string[]> {
  try {
    const v = JSON.parse(String((await storage.getItem(BLOCKED_KEY, "")) || "[]"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
async function blockCode(code: string) {
  const list = await blockedCodes();
  if (!list.includes(code)) await storage.setItem(BLOCKED_KEY, JSON.stringify([code, ...list].slice(0, 200)));
}

type Send = (c: { type: string; [k: string]: unknown }) => void;

/**
 * In-call safety: report / block, recording only with the other person's consent,
 * and a red banner while the other side is recording. The screen forwards stage events to `onEvent`.
 */
export function useSafety(role: "viewer" | "sender", send: Send, peerCode?: string | null, onBlocked?: () => void) {
  const [ask, setAsk] = useState(false);
  const [peerRec, setPeerRec] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("molestie");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [suspended, setSuspended] = useState(false);

  const onEvent = useCallback((e: StageEvent) => {
    switch (e.type) {
      case "recAsk":
        setAsk(true);
        return true;
      case "recPeer":
        setPeerRec(e.on);
        return true;
      case "recWaiting":
        setMsg(tr("Ho chiesto il consenso all'altra persona…", "Asked the other person for consent…"));
        return true;
      case "reported":
        setMsg(e.ok ? tr("Segnalazione inviata. Grazie!", "Report sent. Thank you!") : tr("Segnalazione non inviata, riprova.", "Report not sent, try again."));
        return true;
      case "blocked":
        setMsg(tr("Utente bloccato: non potrà più chiamarti.", "User blocked: they can't call you anymore."));
        return true;
      case "suspended":
        setSuspended(true);
        return true;
      case "ended":
        setAsk(false);
        setPeerRec(false);
        return false;
      case "incoming":
      case "connected":
        setMsg(null); // a new call: old safety messages no longer apply
        return false;
    }
    return false;
  }, []);

  const block = async () => {
    setConfirmBlock(false);
    if (role === "viewer") send({ type: "block" });
    else if (peerCode) {
      await blockCode(peerCode);
      send({ type: "hangup" });
      setMsg(tr(`Codice ${peerCode} bloccato: non potrai più chiamarlo per errore.`, `Code ${peerCode} blocked: you can't call it by mistake anymore.`));
    }
    onBlocked?.();
  };

  // always visible (also after the call ends): suspension and the last safety message
  const banner =
    suspended || msg ? (
      <View style={styles.wrap}>
        {suspended ? (
          <View style={styles.rec} testID={`${role}-suspended-banner`}>
            <Text style={styles.recText}>{tr("Account sospeso: è stato segnalato da più utenti. Non puoi fare né ricevere chiamate.", "Account suspended: it was reported by several users. You can't make or receive calls.")}</Text>
          </View>
        ) : null}
        {msg ? (
          <Text style={styles.msg} testID={`${role}-safety-msg`}>
            {msg}
          </Text>
        ) : null}
      </View>
    ) : null;

  const ui = (
    <View style={styles.wrap} testID={`${role}-safety`}>
      {peerRec ? (
        <View style={styles.rec} testID={`${role}-peer-rec-banner`}>
          <View style={styles.dot} />
          <Text style={styles.recText}>{tr("L'altra persona sta registrando questa chiamata", "The other person is recording this call")}</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <Btn compact testID={`${role}-report-button`} label={tr("Segnala", "Report")} icon="flag" onPress={() => setReport(true)} style={styles.flex} />
        {confirmBlock ? (
          <Btn compact testID={`${role}-block-confirm`} label={tr("Sicuro? Blocca", "Sure? Block")} icon="slash" variant="danger" onPress={block} style={styles.flex} />
        ) : (
          <Btn compact testID={`${role}-block-button`} label={tr("Blocca", "Block")} icon="slash" onPress={() => setConfirmBlock(true)} style={styles.flex} />
        )}
      </View>

      <Modal visible={ask} transparent animationType="fade" onRequestClose={() => setAsk(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet} testID={`${role}-rec-consent`}>
            <Feather name="video" size={28} color={colors.accent} />
            <Text style={styles.title}>{tr("L'altra persona vuole registrare", "The other person wants to record")}</Text>
            <Text style={styles.body}>{tr("La chiamata verrà salvata sul suo dispositivo. Se accetti, vedrai un avviso rosso per tutta la registrazione.", "The call will be saved on their device. If you accept, you'll see a red warning for the whole recording.")}</Text>
            <View style={styles.row}>
              <Btn
                compact
                testID={`${role}-rec-deny`}
                label={tr("Non accetto", "Decline")}
                style={styles.flex}
                onPress={() => {
                  setAsk(false);
                  send({ type: "recAnswer", ok: false });
                }}
              />
              <Btn
                compact
                testID={`${role}-rec-allow`}
                label={tr("Accetto", "Accept")}
                variant="primary"
                style={styles.flex}
                onPress={() => {
                  setAsk(false);
                  send({ type: "recAnswer", ok: true });
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={report} transparent animationType="slide" onRequestClose={() => setReport(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet} testID={`${role}-report-sheet`}>
            <Text style={styles.title}>{tr("Segnala questo utente", "Report this user")}</Text>
            {REASONS().map((r) => (
              <Pressable
                key={r.id}
                testID={`${role}-report-reason-${r.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: reason === r.id }}
                onPress={() => setReason(r.id)}
                style={[styles.reason, reason === r.id && styles.reasonOn]}
              >
                <Feather name={reason === r.id ? "check-circle" : "circle"} size={20} color={reason === r.id ? colors.accent : colors.muted} />
                <Text style={styles.reasonText}>{r.label}</Text>
              </Pressable>
            ))}
            <TextInput
              testID={`${role}-report-note`}
              value={note}
              onChangeText={setNote}
              placeholder={tr("Cosa è successo? (facoltativo)", "What happened? (optional)")}
              placeholderTextColor={colors.muted}
              maxLength={500}
              multiline
              style={styles.input}
            />
            <View style={styles.row}>
              <Btn compact testID={`${role}-report-cancel`} label={tr("Annulla", "Cancel")} style={styles.flex} onPress={() => setReport(false)} />
              <Btn
                compact
                testID={`${role}-report-send`}
                label={tr("Invia", "Send")}
                icon="send"
                variant="primary"
                style={styles.flex}
                onPress={() => {
                  send({ type: "report", reason, note });
                  setReport(false);
                  setNote("");
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  return { onEvent, ui, banner };
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: spacing.sm },
  rec: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.error },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.onSurface },
  recText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.onSurface },
  msg: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.scrim },
  sheet: { gap: spacing.md, padding: spacing.xl, paddingBottom: spacing["2xl"], borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.surfaceSecondary },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  reason: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  reasonOn: { borderColor: colors.accent },
  reasonText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  input: { minHeight: 80, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, fontFamily: fonts.regular, fontSize: 16, color: colors.onSurface, textAlignVertical: "top" },
});
