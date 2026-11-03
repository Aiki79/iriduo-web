import { Feather } from "@react-native-vector-icons/feather";
import { useMicrophonePermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ScreenOrientation from "expo-screen-orientation";
import { DeviceMotion } from "expo-sensors";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StageView } from "@/src/components/StageView";
import type { StageEvent, StageHandle } from "@/src/components/stage-types";
import { Btn, Chip, ChipRow, Header, IconBtn, Label, StatusBox, Toggle } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";

type Phase = "connecting" | "waiting" | "incoming" | "answering" | "connected" | "error";
const isWeb = Platform.OS === "web";

function PulsingAnswer({ onPress }: { onPress: () => void }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(withTiming(0.95, { duration: 650 }), -1, true);
  }, [s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.flex, style]}>
      <Btn testID="viewer-answer-button" label="Rispondi" icon="phone" variant="success" onPress={onPress} />
    </Animated.View>
  );
}

export default function Viewer() {
  const insets = useSafeAreaInsets();
  const stage = useRef<StageHandle>(null);
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState("Collegamento al server…");
  const [phase, setPhase] = useState<Phase>("connecting");
  const [format, setFormat] = useState<"sbs" | "tb">("sbs");
  const [swap, setSwap] = useState(false);
  const [view, setView] = useState<"drag" | "split">("drag");
  const [motion, setMotion] = useState(false);
  const [motionDenied, setMotionDenied] = useState(false);
  const [full, setFull] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [micPerm, requestMic] = useMicrophonePermissions();

  const send = useCallback((c: { type: string; [k: string]: unknown }) => stage.current?.send(c), []);

  const onEvent = useCallback(
    (e: StageEvent) => {
      switch (e.type) {
        case "ready":
          send({ type: "setFormat", value: format });
          send({ type: "setSwap", on: swap });
          send({ type: "setView", value: view });
          send({ type: "setMotion", on: motion });
          break;
        case "code":
          setCode(e.code);
          setPhase("waiting");
          break;
        case "status":
          setStatus(e.text);
          break;
        case "error":
          setStatus(e.text);
          setPhase("error");
          break;
        case "incoming":
          setPhase("incoming");
          if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "connected":
          setPhase("connected");
          setTestOpen(false);
          break;
        case "ended":
          setPhase("waiting");
          break;
        case "test":
          setTestOpen(false);
          break;
      }
    },
    [format, swap, view, motion, send],
  );

  useEffect(() => send({ type: "setFormat", value: format }), [format, send]);
  useEffect(() => send({ type: "setSwap", on: swap }), [swap, send]);
  useEffect(() => send({ type: "setView", value: view }), [view, send]);
  useEffect(() => send({ type: "showFile", on: testOpen }), [testOpen, send]);
  useEffect(() => send({ type: "setMotion", on: motion }), [motion, send]);

  // Phone motion -> camera orientation inside the 3D scene
  useEffect(() => {
    if (!motion || isWeb) return;
    let sub: { remove: () => void } | null = null;
    let alive = true;
    (async () => {
      const current = await DeviceMotion.getPermissionsAsync();
      const res = current.granted ? current : current.canAskAgain ? await DeviceMotion.requestPermissionsAsync() : current;
      if (!alive) return;
      if (!res.granted) {
        setMotion(false);
        setMotionDenied(true);
        return;
      }
      setMotionDenied(false);
      DeviceMotion.setUpdateInterval(33);
      sub = DeviceMotion.addListener((d) => {
        if (d.rotation) send({ type: "orient", a: d.rotation.alpha, b: d.rotation.beta, g: d.rotation.gamma, o: d.orientation ?? 0 });
      });
    })();
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [motion, send]);

  // Fullscreen: landscape on phones
  useEffect(() => {
    if (isWeb) return;
    ScreenOrientation.lockAsync(full ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, [full]);
  useEffect(
    () => () => {
      if (!isWeb) ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    },
    [],
  );

  const answer = async () => {
    setPhase("answering");
    if (!isWeb && micPerm && !micPerm.granted && micPerm.canAskAgain) await requestMic();
    send({ type: "answer" });
  };

  const chooseView = (v: "drag" | "split") => {
    setView(v);
    if (v === "split" && !isWeb) setMotion(true);
  };

  const inCall = phase === "connected" || phase === "answering";
  const micBlocked = !isWeb && micPerm && !micPerm.granted && !micPerm.canAskAgain;

  return (
    <View style={styles.root} testID="viewer-screen">
      <StatusBar hidden={full} style="light" />
      {!full && <Header title="Visore" />}

      {!full && (
        <View style={styles.top}>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Comunica questo codice a chi ti chiama</Text>
            <Text style={styles.code} testID="viewer-code" selectable>
              {code ?? "······"}
            </Text>
          </View>
          <StatusBox testID="viewer-status" text={status} tone={phase === "error" ? "error" : phase === "connected" ? "success" : "info"} />
          {phase === "incoming" && (
            <Animated.View entering={FadeIn} style={styles.incoming} testID="viewer-incoming">
              <PulsingAnswer onPress={answer} />
              <View style={styles.flex}>
                <Btn testID="viewer-decline-button" label="Rifiuta" icon="x" variant="danger" onPress={() => send({ type: "decline" })} />
              </View>
            </Animated.View>
          )}
          {phase === "incoming" && micBlocked && (
            <View style={styles.micRow}>
              <Text style={styles.small}>Microfono bloccato: l’altra persona non ti sentirà.</Text>
              <Btn compact testID="viewer-open-settings-button" label="Apri Impostazioni" onPress={() => Linking.openSettings()} />
            </View>
          )}
          {phase === "error" && (
            <Btn testID="viewer-retry-button" label="Riprova" icon="refresh-cw" variant="primary" onPress={() => stage.current?.reload()} />
          )}
        </View>
      )}

      <View
        style={full ? styles.stageFull : [styles.stageBox, { aspectRatio: view === "split" ? 2 : 16 / 9 }]}
        testID="viewer-stage-container"
      >
        <StageView ref={stage} mode="viewer" onEvent={onEvent} testID="viewer-stage" />
        {full ? (
          <View style={[styles.fullBar, { top: Math.max(insets.top, spacing.md), left: Math.max(insets.left, spacing.md), right: Math.max(insets.right, spacing.md) }]}>
            <IconBtn icon="minimize-2" label="Esci da schermo intero" testID="viewer-exit-fullscreen-button" onPress={() => setFull(false)} />
            <View style={styles.row}>
              {motion && <IconBtn icon="crosshair" label="Ricentra" testID="viewer-recenter-fullscreen-button" onPress={() => send({ type: "recenter" })} />}
              {inCall && (
                <IconBtn icon="phone-off" label="Chiudi chiamata" testID="viewer-hangup-fullscreen-button" onPress={() => send({ type: "hangup" })} />
              )}
            </View>
          </View>
        ) : (
          <View style={styles.stageBtn}>
            <IconBtn icon="maximize-2" label="Schermo intero" testID="viewer-fullscreen-button" onPress={() => setFull(true)} />
          </View>
        )}
      </View>

      {!full && (
        <ScrollView style={styles.flex} contentContainerStyle={[styles.controls, { paddingBottom: insets.bottom + spacing.xl }]} testID="viewer-controls">
          {inCall && (
            <Btn testID="viewer-hangup-button" label="Chiudi chiamata" icon="phone-off" variant="danger" onPress={() => send({ type: "hangup" })} style={styles.mt} />
          )}

          <Label>Come guardare</Label>
          <ChipRow testID="viewer-view-chips">
            <Chip testID="viewer-view-drag-chip" icon="move" label="Con il dito" selected={view === "drag"} onPress={() => chooseView("drag")} />
            <Chip testID="viewer-view-split-chip" icon="columns" label="Schermo diviso" selected={view === "split"} onPress={() => chooseView("split")} />
          </ChipRow>
          {view === "split" && (
            <View style={styles.tip} testID="viewer-split-tip">
              <Feather name="smartphone" size={20} color={colors.brandPrimary} />
              <Text style={styles.tipText}>Metti il telefono in orizzontale dentro un visore tipo Cardboard, poi tocca Schermo intero.</Text>
            </View>
          )}
          {view === "split" && <Btn testID="viewer-split-fullscreen-button" label="Schermo intero" icon="maximize" variant="primary" onPress={() => setFull(true)} style={styles.mt} />}

          <Toggle
            testID="viewer-motion-toggle"
            label="Muovi il telefono per guardarti intorno"
            hint={isWeb ? "Disponibile nell'app sul telefono" : "Usa i sensori di movimento del telefono"}
            value={motion}
            onChange={(v) => !isWeb && setMotion(v)}
          />
          {motion && <Btn compact testID="viewer-recenter-button" label="Ricentra la vista" icon="crosshair" onPress={() => send({ type: "recenter" })} style={styles.mt} />}
          {motionDenied && (
            <View style={styles.micRow}>
              <Text style={styles.small}>Permesso movimento negato: puoi usare il dito.</Text>
              <Btn compact testID="viewer-motion-settings-button" label="Apri Impostazioni" onPress={() => Linking.openSettings()} />
            </View>
          )}

          <Label>Formato video</Label>
          <ChipRow testID="viewer-format-chips">
            <Chip testID="viewer-format-sbs-chip" label="Affiancate (VR180 standard)" selected={format === "sbs"} onPress={() => setFormat("sbs")} />
            <Chip testID="viewer-format-tb-chip" label="Una sopra l'altra" selected={format === "tb"} onPress={() => setFormat("tb")} />
          </ChipRow>
          <Toggle testID="viewer-swap-toggle" label="Scambia occhio sinistro e destro" value={swap} onChange={setSwap} />

          <Label>Prova senza chiamata</Label>
          <Text style={styles.small}>Carica un video VR180 salvato sul telefono per verificare l’effetto 3D.</Text>
          <Btn
            testID="viewer-test-video-button"
            label={testOpen ? "Annulla" : "Scegli un video di prova"}
            icon={testOpen ? "x" : "film"}
            disabled={inCall}
            onPress={() => setTestOpen((o) => !o)}
            style={styles.mt}
          />
          {testOpen && <Text style={[styles.small, styles.mt]}>Tocca il riquadro nella scena qui sopra per scegliere il video.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: spacing.sm },
  mt: { marginTop: spacing.sm },
  top: { paddingHorizontal: spacing.lg, gap: spacing.md },
  codeCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  codeLabel: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  code: { fontFamily: fonts.bold, fontSize: 52, letterSpacing: 8, color: colors.brandPrimary, marginTop: spacing.xs },
  incoming: { flexDirection: "row", gap: spacing.md },
  micRow: { gap: spacing.sm, marginTop: spacing.sm },
  small: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, lineHeight: 21 },
  stageBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.stage,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stageFull: { flex: 1, backgroundColor: colors.stage },
  stageBtn: { position: "absolute", top: spacing.sm, right: spacing.sm },
  fullBar: { position: "absolute", flexDirection: "row", justifyContent: "space-between", opacity: 0.8 },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  tip: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  tipText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.onSurface, lineHeight: 21 },
});
