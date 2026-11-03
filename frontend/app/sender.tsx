import { Feather } from "@react-native-vector-icons/feather";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StageView } from "@/src/components/StageView";
import { CallPill, CallStatsCard, type CallStatsData } from "@/src/components/CallStats";
import type { Device, StageEvent, StageHandle } from "@/src/components/stage-types";
import { Btn, Chip, ChipRow, Header, Label, StatusBox } from "@/src/components/ui";
import { addRecentCode, getRecentCodes } from "@/src/recent";
import { colors, fonts, radius, spacing } from "@/src/theme";

const isWeb = Platform.OS === "web";
const RESOLUTIONS = [
  { value: "3840x1920", label: "4K · consigliata" },
  { value: "2880x1440", label: "2,9K" },
  { value: "1920x960", label: "HD · rete lenta" },
];
const BITRATES = [
  { value: 40000000, label: "Alta · 40 Mbit/s" },
  { value: 20000000, label: "Media · 20 Mbit/s" },
  { value: 10000000, label: "Bassa · 10 Mbit/s" },
];
const BAR_HEIGHT = 88;

function prettyLabel(l: string) {
  const s = l.toLowerCase();
  if (s.includes("front")) return "Frontale";
  if (s.includes("back") || s.includes("rear") || s.includes("environment")) return l.match(/\d+/) ? `Posteriore ${l.match(/\d+/)?.[0]}` : "Posteriore";
  return l;
}

function PermissionGate() {
  const insets = useSafeAreaInsets();
  const [cam, reqCam] = useCameraPermissions();
  const [mic, reqMic] = useMicrophonePermissions();
  if (!cam || !mic) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }
  const blocked = (!cam.granted && !cam.canAskAgain) || (!mic.granted && !mic.canAskAgain);
  return (
    <View style={[styles.gate, { paddingBottom: insets.bottom + spacing.xl }]} testID="sender-permission-gate">
      <View style={styles.gateIcon}>
        <Feather name="video" size={34} color={colors.onBrandPrimary} />
      </View>
      <Text style={styles.gateTitle}>Camera e microfono</Text>
      <Text style={styles.gateText}>
        Servono per inviare il tuo video 3D e la tua voce al visore. Puoi usare la camera VR180 collegata al telefono o la fotocamera per una prova.
      </Text>
      {blocked ? (
        <Btn testID="sender-open-settings-button" label="Apri Impostazioni" icon="settings" variant="primary" onPress={() => Linking.openSettings()} />
      ) : (
        <Btn
          testID="sender-grant-permission-button"
          label="Consenti camera e microfono"
          icon="check"
          variant="primary"
          onPress={async () => {
            if (!cam.granted) await reqCam();
            if (!mic.granted) await reqMic();
          }}
        />
      )}
      {blocked && <Text style={styles.gateHint}>Hai negato il permesso: abilitalo nelle impostazioni e torna qui.</Text>}
    </View>
  );
}

export default function Sender() {
  const [cam] = useCameraPermissions();
  const [mic] = useMicrophonePermissions();
  const granted = isWeb || (cam?.granted && mic?.granted);
  return (
    <View style={styles.root} testID="sender-screen">
      <Header title="Trasmissione" />
      {granted ? <SenderBody /> : <PermissionGate />}
    </View>
  );
}

function SenderBody() {
  const insets = useSafeAreaInsets();
  const stage = useRef<StageHandle>(null);
  const [cams, setCams] = useState<Device[]>([]);
  const [mics, setMics] = useState<Device[]>([]);
  const [camId, setCamId] = useState("");
  const [micId, setMicId] = useState("");
  const [res, setRes] = useState("3840x1920");
  const [bitrate, setBitrate] = useState(20000000);
  const [code, setCode] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "calling" | "live">("idle");
  const [status, setStatus] = useState("Avvio della camera…");
  const [tone, setTone] = useState<"info" | "error" | "success">("info");
  const [resText, setResText] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stats, setStats] = useState<CallStatsData | null>(null);

  useEffect(() => {
    getRecentCodes().then(setRecent);
  }, []);

  const { code: linkCode } = useLocalSearchParams<{ code?: string }>();
  const linkRef = useRef<string | null>(null);
  useEffect(() => {
    if (linkCode && /^\d{6}$/.test(linkCode)) {
      linkRef.current = linkCode;
      setCode(linkCode);
      setStatus(`Codice ${linkCode} ricevuto dal link: tocca Chiama quando la camera è pronta.`);
      setTone("success");
    }
  }, [linkCode]);

  const sendConfig = useCallback(() => {
    if (camId) stage.current?.send({ type: "config", cfg: { cam: camId, mic: micId, res, bitrate } });
  }, [camId, micId, res, bitrate]);
  useEffect(sendConfig, [sendConfig]);

  const onEvent = useCallback(
    (e: StageEvent) => {
      switch (e.type) {
        case "ready":
          sendConfig();
          break;
        case "devices":
          setCams(e.cams);
          setMics(e.mics);
          setCamId((c) => (e.cams.find((x) => x.id === c) ? c : e.cam));
          setMicId((m) => (e.mics.find((x) => x.id === m) ? m : e.mic));
          break;
        case "resolution":
          setResText(`Risoluzione effettiva: ${e.w} × ${e.h}${e.w < e.requested ? " (la camera non supporta quella richiesta)" : ""}`);
          break;
        case "status":
          if (linkRef.current && e.text.startsWith("Camera pronta")) {
            setStatus(`Camera pronta. Codice ${linkRef.current} ricevuto dal link: tocca Chiama.`);
            setTone("success");
            break;
          }
          setStatus(e.text);
          setTone(/errore|non |negato/i.test(e.text) ? "error" : /collegato/i.test(e.text) ? "success" : "info");
          break;
        case "permError":
          setStatus(e.text);
          setTone("error");
          break;
        case "calling":
          setPhase("calling");
          setStartedAt(null);
          setStats(null);
          break;
        case "connected":
          setPhase("live");
          setStartedAt((t) => t ?? Date.now());
          break;
        case "ended":
          setPhase("idle");
          setStartedAt(null);
          setStats(null);
          break;
        case "stats":
          setStats(e);
          break;
      }
    },
    [sendConfig],
  );

  const valid = /^\d{6}$/.test(code);
  const busy = phase !== "idle";

  const call = async () => {
    if (!valid) {
      setStatus("Il codice deve avere 6 cifre.");
      setTone("error");
      return;
    }
    setRecent(await addRecentCode(code));
    stage.current?.send({ type: "call", code });
  };

  return (
    <View style={styles.flex}>
      <View style={styles.preview} testID="sender-preview-container">
        <StageView ref={stage} mode="sender" onEvent={onEvent} testID="sender-preview" />
        {phase === "live" && (
          <View style={styles.liveBadge} testID="sender-live-badge">
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>IN ONDA</Text>
          </View>
        )}
        {phase === "live" && startedAt ? (
          <View style={styles.pillPos}>
            <CallPill startedAt={startedAt} stats={stats} testID="sender-call-pill" />
          </View>
        ) : null}
      </View>
      {resText ? (
        <Text style={styles.resText} testID="sender-resolution-text">
          {resText}
        </Text>
      ) : null}

      <KeyboardAwareScrollView
        style={styles.flex}
        bottomOffset={BAR_HEIGHT + spacing.lg}
        contentContainerStyle={[styles.form, { paddingBottom: BAR_HEIGHT + insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        testID="sender-form"
      >
        <StatusBox testID="sender-status" text={status} tone={tone} />
        {phase === "live" && startedAt ? (
          <View style={styles.statsWrap}>
            <CallStatsCard startedAt={startedAt} stats={stats} direction="out" testID="sender-call-stats" />
          </View>
        ) : null}

        <Label>Codice mostrato sul visore</Label>
        <TextInput
          testID="sender-code-input"
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="6 cifre"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          maxLength={6}
          editable={!busy}
          returnKeyType="done"
          style={[styles.input, valid && styles.inputValid]}
        />
        {recent.length > 0 && (
          <ChipRow testID="sender-recent-codes">
            {recent.map((c) => (
              <Chip key={c} testID={`sender-recent-code-${c}`} icon="clock" label={c} selected={code === c} onPress={() => !busy && setCode(c)} />
            ))}
          </ChipRow>
        )}

        <View style={[styles.warn]} testID="sender-camera-warning">
          <Feather name="alert-triangle" size={18} color={colors.warning} />
          <Text style={styles.warnText}>
            La camera VR180 deve inviare l’immagine già unita (due metà affiancate). Collegala al telefono come webcam USB, oppure usa la fotocamera per una prova.
          </Text>
        </View>

        <View pointerEvents={busy ? "none" : "auto"} style={busy && styles.dim}>
          <Label>Camera</Label>
          <ChipRow testID="sender-camera-chips">
            {cams.length === 0 && <Text style={styles.small}>Ricerca camere…</Text>}
            {cams.map((c, i) => (
              <Chip key={c.id} testID={`sender-camera-chip-${i}`} icon="camera" label={prettyLabel(c.label)} selected={camId === c.id} onPress={() => setCamId(c.id)} />
            ))}
          </ChipRow>
          <Label>Microfono</Label>
          <ChipRow testID="sender-mic-chips">
            {mics.length === 0 && <Text style={styles.small}>Ricerca microfoni…</Text>}
            {mics.map((m, i) => (
              <Chip key={m.id} testID={`sender-mic-chip-${i}`} icon="mic" label={m.label} selected={micId === m.id} onPress={() => setMicId(m.id)} />
            ))}
          </ChipRow>
          <Label>Risoluzione</Label>
          <ChipRow testID="sender-resolution-chips">
            {RESOLUTIONS.map((r) => (
              <Chip key={r.value} testID={`sender-resolution-${r.value}`} label={r.label} selected={res === r.value} onPress={() => setRes(r.value)} />
            ))}
          </ChipRow>
        </View>
        <Label>Qualità di invio</Label>
        <ChipRow testID="sender-bitrate-chips">
          {BITRATES.map((b) => (
            <Chip key={b.value} testID={`sender-bitrate-${b.value}`} label={b.label} selected={bitrate === b.value} onPress={() => setBitrate(b.value)} />
          ))}
        </ChipRow>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ opened: insets.bottom }} style={[styles.bar, { paddingBottom: insets.bottom + spacing.lg }]}>
        {busy ? (
          <Btn
            testID="sender-hangup-button"
            label={phase === "calling" ? "Annulla chiamata" : "Chiudi chiamata"}
            icon="phone-off"
            variant="danger"
            onPress={() => stage.current?.send({ type: "hangup" })}
          />
        ) : (
          <Btn testID="sender-call-button" label="Chiama" icon="phone-call" variant="primary" disabled={!valid} onPress={call} />
        )}
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.5 },
  preview: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    aspectRatio: 2,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.stage,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillPos: { position: "absolute", top: spacing.sm, right: spacing.sm },
  statsWrap: { marginTop: spacing.sm },
  liveBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onError },
  liveText: { fontFamily: fonts.bold, fontSize: 12, color: colors.onError, letterSpacing: 1 },
  resText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginHorizontal: spacing.lg, marginTop: spacing.xs },
  form: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  input: {
    minHeight: 64,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.bold,
    fontSize: 30,
    letterSpacing: 8,
    color: colors.onSurface,
  },
  inputValid: { borderColor: colors.brandPrimary },
  warn: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.warningSurface,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  warnText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  small: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  gate: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: "center", gap: spacing.lg },
  gateIcon: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  gateTitle: { fontFamily: fonts.bold, fontSize: 28, color: colors.onSurface },
  gateText: { fontFamily: fonts.regular, fontSize: 17, color: colors.muted, lineHeight: 25 },
  gateHint: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
