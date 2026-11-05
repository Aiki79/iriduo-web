import { Feather } from "@react-native-vector-icons/feather";
import { useMicrophonePermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ScreenOrientation from "expo-screen-orientation";
import { DeviceMotion } from "expo-sensors";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import { AppState, Linking, Platform, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StageView } from "@/src/components/StageView";
import { ChatComposer, ChatPanel, ChatToasts, newMessage, type ChatMessage } from "@/src/components/CallChat";
import { ReactionBar } from "@/src/components/Reactions";
import { FE_BASE, FisheyePanel, type Fisheye } from "@/src/components/FisheyePanel";
import { HeartBurst } from "@/src/components/Warm";
import { useSafety } from "@/src/components/Safety";
import { FREE_REACTIONS, useProState } from "@/src/pro";
import { ChunkReceiver, readMemoryBase64, saveAndShare, sendVideoFile } from "@/src/media";
import { CallPill, CallStatsCard, formatDuration, quality, type CallStatsData } from "@/src/components/CallStats";
import { addCall, topQuality } from "@/src/history";
import { ShareCode } from "@/src/components/ShareCode";
import type { StageEvent, StageHandle } from "@/src/components/stage-types";
import { Btn, Chip, ChipRow, Header, IconBtn, Label, StatusBox, Toggle, type IconName } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";

type Phase = "connecting" | "waiting" | "incoming" | "answering" | "connected" | "error";
const isWeb = Platform.OS === "web";
const DEMOS: { id: string; label: string; icon: IconName }[] = [
  { id: "sfere", label: "Sfere fluttuanti", icon: "circle" },
  { id: "tunnel", label: "Tunnel di luce", icon: "target" },
  { id: "stelle", label: "Cielo e scritta 3D", icon: "star" },
];

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
  const { photo, video } = useLocalSearchParams<{ photo?: string; video?: string }>();
  const [fixedOn, setFixedOn] = useState<boolean | null>(null);
  const [initQuery, setInitQuery] = useState<string | undefined>(undefined);
  const fixedOnRef = useRef(false);
  useEffect(() => {
    Promise.all([storage.getItem("fixed_code_on", false), storage.getItem("fixed_code", "")]).then(([on, saved]) => {
      const enabled = !!on;
      fixedOnRef.current = enabled;
      if (enabled && /^\d{6}$/.test(String(saved))) setInitQuery(`fixed=${saved}`);
      setFixedOn(enabled);
    });
  }, []);
  const toggleFixed = (v: boolean) => {
    fixedOnRef.current = v;
    setFixedOn(v);
    storage.setItem("fixed_code_on", v);
    if (v && codeRef.current) storage.setItem("fixed_code", codeRef.current);
  };
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState("Collegamento al server…");
  const [phase, setPhase] = useState<Phase>("connecting");
  const [format, setFormatState] = useState<"sbs" | "tb" | "fisheye">("sbs");
  // the chosen layout is remembered on this headset (the ELP user doesn't have to pick it every time)
  const setFormat = useCallback((f: "sbs" | "tb" | "fisheye") => {
    setFormatState(f);
    storage.setItem("viewer_format", f);
  }, []);
  useEffect(() => {
    if (photo || video) return; // saved photos/videos pick their own layout
    storage.getItem("viewer_format", "sbs").then((f) => {
      if (f === "sbs" || f === "tb" || f === "fisheye") setFormatState(f);
    });
  }, [photo, video]);
  const [fe, setFe] = useState<Fisheye>(FE_BASE);
  const [guide, setGuide] = useState(false);
  const [xrOk, setXrOk] = useState(false);
  const [heart, setHeart] = useState(false);
  const heartShownRef = useRef(false);
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (heartTimer.current) clearTimeout(heartTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (format !== "fisheye" && guide) {
      setGuide(false);
      stage.current?.send({ type: "feGuide", on: false });
    }
  }, [format, guide]);
  const [swap, setSwap] = useState(false);
  const [view, setView] = useState<"drag" | "split">("drag");
  const [motion, setMotion] = useState(false);
  const [motionDenied, setMotionDenied] = useState(false);
  const [full, setFull] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stats, setStats] = useState<CallStatsData | null>(null);
  // Presence: lets callers who already know this code see it is "in attesa"
  const [appActive, setAppActive] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setAppActive(s === "active"));
    return () => sub.remove();
  }, []);
  // Random secret proving to the server that this viewer owns the code. Saved on the device,
  // so reopening the app right after it was killed doesn't lock the viewer out of its own code.
  const presenceToken = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    storage.getItem("presence_token", "").then((saved) => {
      if (typeof saved === "string" && /^[A-Za-z0-9-]{16,64}$/.test(saved)) presenceToken.current = saved;
      else storage.setItem("presence_token", presenceToken.current);
    });
  }, []);
  useEffect(() => {
    if (!code || phase !== "waiting" || !appActive) return;
    const base = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/presence`;
    const token = presenceToken.current;
    const leave = () => fetch(`${base}/${code}?token=${token}`, { method: "DELETE", keepalive: true }).catch(() => {});
    const ping = () =>
      fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, token }) }).catch(() => {});
    ping();
    const id = setInterval(ping, 8000);
    const vis = () => (document.visibilityState === "hidden" ? leave() : ping());
    if (isWeb) {
      window.addEventListener("pagehide", leave);
      document.addEventListener("visibilitychange", vis);
    }
    return () => {
      clearInterval(id);
      if (isWeb) {
        window.removeEventListener("pagehide", leave);
        document.removeEventListener("visibilitychange", vis);
      }
      leave();
    };
  }, [code, phase, appActive]);

  const [testing, setTesting] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const lastBuzzRef = useRef(0);
  const [recAt, setRecAt] = useState<number | null>(null);
  const [recNow, setRecNow] = useState(Date.now());
  const [mediaMsg, setMediaMsg] = useState<{ text: string; tone: "info" | "success" | "error" } | null>(null);
  const receiver = useRef(new ChunkReceiver());
  useEffect(() => {
    if (!recAt) return;
    const id = setInterval(() => setRecNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [recAt]);
  const codeRef = useRef<string>("");
  const callRef = useRef<{ at: number; counts: Record<string, number> } | null>(null);
  const incomingRef = useRef(false);
  const declinedRef = useRef(false);

  const send = useCallback((c: { type: string; [k: string]: unknown }) => stage.current?.send(c), []);

  const sendChat = useCallback(
    (text: string) => {
      const m = newMessage("me", text);
      setMessages((a) => [...a, m]);
      send({ type: "chat", text, id: m.id });
    },
    [send],
  );

  const react = useCallback((kind: string) => send({ type: "react", kind }), [send]);
  const safety = useSafety("viewer", send);
  const safetyEvent = useRef(safety.onEvent);
  safetyEvent.current = safety.onEvent;
  const router = useRouter();
  const { pro } = useProState();
  const goPro = useCallback(() => {
    setFull(false);
    router.push("/pro");
  }, [router]);
  const snap = () => (pro ? send({ type: "snapshot" }) : goPro());
  const rec = () => (pro ? send({ type: recAt ? "recStop" : "recStart" }) : goPro());

  const onEvent = useCallback(
    (e: StageEvent) => {
      if (safetyEvent.current(e)) return;
      switch (e.type) {
        case "xrSupport":
          setXrOk(e.on);
          break;
        case "xr":
          if (e.on) setFull(false); // the headset takes over the display
          break;
        case "fisheye":
          setFe(e.value);
          break;
        case "ready":
          send({ type: "setFormat", value: format });
          send({ type: "setSwap", on: swap });
          send({ type: "setView", value: view });
          send({ type: "setMotion", on: motion });
          send({ type: "feGuide", on: guide && format === "fisheye" });
          if (video && !isWeb) {
            setMediaMsg({ text: "Carico la registrazione…", tone: "info" });
            sendVideoFile(video, (c) => send(c))
              .then(() => setMediaMsg({ text: `Registrazione: ${video}`, tone: "success" }))
              .catch(() => setMediaMsg({ text: "Non riesco ad aprire la registrazione.", tone: "error" }));
          }
          if (photo && !isWeb) {
            readMemoryBase64(photo)
              .then((data) => {
                const f = /_TB\./.test(photo) ? "tb" : /_FE\./.test(photo) ? "fisheye" : "sbs";
                send({ type: "setFormat", value: f });
                setFormatState(f);
                send({ type: "showImage", data, name: photo });
              })
              .catch(() => setMediaMsg({ text: "Non riesco ad aprire la foto.", tone: "error" }));
          }
          break;
        case "code":
          setCode(e.code);
          codeRef.current = e.code;
          setPhase("waiting");
          if (fixedOnRef.current) storage.setItem("fixed_code", e.code);
          break;
        case "codeTaken":
          setMediaMsg({ text: "Il tuo codice fisso era occupato: ne ho creato uno nuovo e l’ho memorizzato.", tone: "info" });
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
          setStartedAt(null);
          setStats(null);
          incomingRef.current = true;
          declinedRef.current = false;
          if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "connected":
          setPhase("connected");
          if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (!heartShownRef.current) {
            heartShownRef.current = true; // guards against two quick "connected" events
            storage.getItem("first_call_done", false).then((done) => {
              if (done) return;
              storage.setItem("first_call_done", true);
              setHeart(true);
              heartTimer.current = setTimeout(() => setHeart(false), 1800);
            });
          }
          setTestOpen(false);
          setTesting(null);
          setStartedAt((t) => t ?? Date.now());
          if (!callRef.current) {
            callRef.current = { at: Date.now(), counts: {} };
            setMessages([]);
            setMediaMsg(null);
          }
          incomingRef.current = false;
          break;
        case "chat":
          setMessages((a) => [...a, newMessage("them", e.text, e.from ? `Visore ${e.from}` : undefined)]);
          if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "snapshot":
          if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setMediaMsg({ text: `Foto 3D pronta: ${e.name}`, tone: "success" });
          if (e.data) saveAndShare(e.name, e.data, "image/jpeg").catch(() => setMediaMsg({ text: "Non sono riuscito a salvare la foto.", tone: "error" }));
          break;
        case "snapError":
        case "recError":
          setMediaMsg({ text: e.text, tone: "error" });
          setRecAt(null);
          break;
        case "recStarted":
          setRecAt(Date.now());
          setRecNow(Date.now());
          setMediaMsg({ text: "Registrazione in corso (massimo 5 minuti).", tone: "info" });
          break;
        case "recSaved":
          setRecAt(null);
          setMediaMsg({ text: `Registrazione salvata: ${e.name}`, tone: "success" });
          break;
        case "recChunk":
          if (e.i === 0) {
            setRecAt(null);
            setMediaMsg({ text: "Preparo il video registrato…", tone: "info" });
          }
          receiver.current.push(e.i, e.n, e.name, e.data, e.mime, (ok) =>
            setMediaMsg(ok ? { text: `Registrazione pronta: ${e.name}`, tone: "success" } : { text: "Non sono riuscito a salvare la registrazione.", tone: "error" }),
          );
          break;
        case "react":
          if (!isWeb && Date.now() - lastBuzzRef.current > 600) {
            lastBuzzRef.current = Date.now();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          break;
        case "chatError":
          setMessages((a) => a.map((m) => (m.id === e.id ? { ...m, failed: true } : m)));
          break;
        case "ended": {
          setPhase("waiting");
          setFull(false);
          setComposerOpen(false);
          setStartedAt(null);
          setStats(null);
          const c = callRef.current;
          if (c) {
            addCall({ role: "in", code: codeRef.current, at: c.at, duration: Date.now() - c.at, quality: topQuality(c.counts), result: "completata" });
          } else if (incomingRef.current) {
            addCall({ role: "in", code: codeRef.current, at: Date.now(), duration: 0, quality: null, result: declinedRef.current ? "rifiutata" : "persa" });
          }
          callRef.current = null;
          incomingRef.current = false;
          declinedRef.current = false;
          break;
        }
        case "stats":
          setStats(e);
          if (callRef.current) {
            const l = quality(e).label;
            callRef.current.counts[l] = (callRef.current.counts[l] ?? 0) + 1;
          }
          break;
        case "test":
          setTestOpen(false);
          setTesting(e.name);
          break;
      }
    },
    [format, swap, view, motion, guide, send],
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
      {!full && (
        <Header
          title="Visore"
          right={
            phase === "waiting" || phase === "error" ? (
              <IconBtn icon="refresh-cw" label="Nuovo codice" testID="viewer-new-code-button" onPress={() => send({ type: "newCode" })} />
            ) : null
          }
        />
      )}

      {!full && (
        <View style={styles.top}>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Comunica questo codice a chi ti chiama</Text>
            <Text style={styles.code} testID="viewer-code" selectable>
              {code ?? "······"}
            </Text>
            <ShareCode code={code} />
          </View>
          <StatusBox testID="viewer-status" text={status} tone={phase === "error" ? "error" : phase === "connected" ? "success" : "info"} />
          {safety.banner}
          {phase === "incoming" && (
            <Animated.View entering={FadeIn} style={styles.incoming} testID="viewer-incoming">
              <PulsingAnswer onPress={answer} />
              <View style={styles.flex}>
                <Btn testID="viewer-decline-button" label="Rifiuta" icon="x" variant="danger" onPress={() => {
                    declinedRef.current = true;
                    send({ type: "decline" });
                  }}
                />
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
        {fixedOn === null ? <View style={styles.flex} /> : <StageView ref={stage} mode="viewer" onEvent={onEvent} testID="viewer-stage" query={initQuery} />}
        {phase === "connected" && !composerOpen ? (
          <ChatToasts messages={messages} split={full && view === "split"} bottom={full ? Math.max(insets.bottom, spacing.md) + 64 : undefined} testID="viewer-chat-toasts" />
        ) : null}
        {full && phase === "connected" && !composerOpen ? (
          <View style={[styles.fullReactions, { bottom: Math.max(insets.bottom, spacing.md) }]}>
            <ReactionBar compact onReact={react} testID="viewer-fullscreen-reactions" unlocked={pro ? undefined : FREE_REACTIONS} onLocked={goPro} />
          </View>
        ) : null}
        {full ? (
          <View style={[styles.fullBar, { top: Math.max(insets.top, spacing.md), left: Math.max(insets.left, spacing.md), right: Math.max(insets.right, spacing.md) }]}>
            <IconBtn icon="minimize-2" label="Esci da schermo intero" testID="viewer-exit-fullscreen-button" onPress={() => setFull(false)} />
            {startedAt && phase === "connected" ? <CallPill startedAt={startedAt} stats={stats} testID="viewer-call-pill" /> : null}
            <View style={styles.row}>
              {motion && <IconBtn icon="crosshair" label="Ricentra" testID="viewer-recenter-fullscreen-button" onPress={() => send({ type: "recenter" })} />}
              {phase === "connected" && (
                <IconBtn icon="camera" label="Foto 3D" testID="viewer-snapshot-fullscreen-button" onPress={snap} />
              )}
              {phase === "connected" && (
                <IconBtn
                  icon={recAt ? "stop-circle" : "circle"}
                  label={recAt ? "Ferma registrazione" : "Registra"}
                  testID="viewer-record-fullscreen-button"
                  onPress={rec}
                />
              )}
              {phase === "connected" && (
                <IconBtn
                  icon={composerOpen ? "x" : "message-circle"}
                  label={composerOpen ? "Chiudi messaggi" : "Messaggi"}
                  testID="viewer-chat-fullscreen-button"
                  onPress={() => setComposerOpen((o) => !o)}
                />
              )}
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
        {full && composerOpen && phase === "connected" ? (
          <KeyboardStickyView
            style={[styles.fullComposer, { left: Math.max(insets.left, spacing.md), right: Math.max(insets.right, spacing.md), bottom: Math.max(insets.bottom, spacing.md) }]}
          >
            <View style={styles.fullComposerInner} testID="viewer-fullscreen-composer">
              {messages.slice(-3).map((m) => (
                <Text key={m.id} style={[styles.fullMsg, m.from === "me" && styles.fullMsgMe]} numberOfLines={2}>
                  {m.from === "me" ? "Tu: " : ""}
                  {m.text}
                </Text>
              ))}
              <ChatComposer onSend={sendChat} testID="viewer-fullscreen-chat" />
            </View>
          </KeyboardStickyView>
        ) : null}
      </View>

      {!full && (
        <KeyboardAwareScrollView
          bottomOffset={spacing.lg}
          keyboardShouldPersistTaps="handled"
          style={styles.flex}
          contentContainerStyle={[styles.controls, { paddingBottom: insets.bottom + spacing.xl }]}
          testID="viewer-controls"
        >
          {inCall && (
            <>
              <Btn testID="viewer-hangup-button" label="Chiudi chiamata" icon="phone-off" variant="danger" onPress={() => send({ type: "hangup" })} style={styles.mt} />
              {safety.ui}
            </>
          )}
          {startedAt && phase === "connected" ? (
            <View style={styles.mt}>
              <CallStatsCard startedAt={startedAt} stats={stats} direction="in" testID="viewer-call-stats" />
            </View>
          ) : null}
          {phase === "connected" || (testing && DEMOS.some((d) => d.id === testing)) ? (
            <View style={styles.mt}>
              <Label>Ricordi 3D</Label>
              <View style={styles.row}>
                <Btn compact testID="viewer-snapshot-button" label={pro ? "Foto 3D" : "Foto 3D · Pro"} icon={pro ? "camera" : "lock"} onPress={snap} style={styles.flex} />
                {phase === "connected" ? (
                  <Btn
                    compact
                    testID="viewer-record-button"
                    label={recAt ? `Ferma ${formatDuration(recNow - recAt)}` : pro ? "Registra" : "Registra · Pro"}
                    icon={recAt ? "stop-circle" : pro ? "circle" : "lock"}
                    variant={recAt ? "danger" : "secondary"}
                    onPress={rec}
                    style={styles.flex}
                  />
                ) : null}
              </View>
            </View>
          ) : null}
          {mediaMsg ? (
            <View style={styles.mt}>
              <StatusBox testID="viewer-media-status" text={mediaMsg.text} tone={mediaMsg.tone} />
            </View>
          ) : null}
          {phase === "connected" ? (
            <View style={styles.mt}>
              <Label>Reazioni nella scena 3D</Label>
              <ReactionBar onReact={react} testID="viewer-reactions" unlocked={pro ? undefined : FREE_REACTIONS} onLocked={goPro} />
            </View>
          ) : null}
          {phase === "connected" ? <ChatPanel messages={messages} onSend={sendChat} testID="viewer-chat" /> : null}

          <Toggle
            testID="viewer-fixed-code-toggle"
            label="Tieni sempre questo codice"
            hint="Così i tuoi contatti non devono aggiornarlo. Il codice cambia solo se tocchi Nuovo codice."
            value={!!fixedOn}
            onChange={toggleFixed}
          />
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
          <Text style={[styles.small, styles.mt]} testID="viewer-xr-note">
            {xrOk
              ? "Visore rilevato: tocca \"Entra nel visore 3D\" in basso nell'anteprima per vedere davvero in 3D."
              : "Visore con telefono (Cardboard, VR Box…): scegli \"Schermo diviso\" e metti a schermo intero. Visori autonomi (Meta Quest, Pico, Apple Vision Pro…) e visori per PC: apri IriDuo nel browser del visore e tocca \"Entra nel visore 3D\"."}
          </Text>

          <Label>Formato video</Label>
          <ChipRow testID="viewer-format-chips">
            <Chip testID="viewer-format-sbs-chip" label="Affiancate (VR180 standard)" selected={format === "sbs"} onPress={() => setFormat("sbs")} />
            <Chip testID="viewer-format-tb-chip" label="Una sopra l'altra" selected={format === "tb"} onPress={() => setFormat("tb")} />
          </ChipRow>
          <ChipRow testID="viewer-format-fisheye-row">
            <Chip wide testID="viewer-format-fisheye-chip" label="Due cerchi fisheye affiancati (camera ELP)" selected={format === "fisheye"} onPress={() => setFormat("fisheye")} />
          </ChipRow>
          {format === "fisheye" && (
            <FisheyePanel
              value={fe}
              onChange={(v) => {
                setFe(v);
                send({ type: "setFisheye", value: v });
              }}
              onReset={() => send({ type: "resetFisheye" })}
              guide={guide}
              onGuide={(on) => {
                setGuide(on);
                send({ type: "feGuide", on });
              }}
            />
          )}
          <Toggle testID="viewer-swap-toggle" label="Scambia occhio sinistro e destro" value={swap} onChange={setSwap} />

          <Label>Prova senza chiamata</Label>
          <Text style={styles.small}>Scegli una demo 3D già pronta, oppure carica un video VR180 salvato sul telefono.</Text>
          <ChipRow testID="viewer-demo-chips">
            {DEMOS.map((d) => (
              <Chip
                key={d.id}
                testID={`viewer-demo-${d.id}-chip`}
                icon={d.icon}
                label={d.label}
                selected={testing === d.id}
                onPress={() => !inCall && send({ type: "demo", name: d.id })}
              />
            ))}
          </ChipRow>
          {testing && DEMOS.some((d) => d.id === testing) ? (
            <Btn compact testID="viewer-demo-stop-button" label="Ferma la demo" icon="square" onPress={() => send({ type: "stopDemo" })} style={styles.mt} />
          ) : null}
          <Btn
            testID="viewer-test-video-button"
            label={testOpen ? "Annulla" : "Video dal telefono"}
            icon={testOpen ? "x" : "film"}
            disabled={inCall}
            onPress={() => setTestOpen((o) => !o)}
            style={styles.mt}
          />
          {testOpen && <Text style={[styles.small, styles.mt]}>Tocca il riquadro nella scena qui sopra per scegliere il video.</Text>}
        </KeyboardAwareScrollView>
      )}
      {heart ? <HeartBurst testID="viewer-heart" /> : null}
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
  code: { fontFamily: fonts.bold, fontSize: 48, letterSpacing: 8, color: colors.brandPrimary, marginTop: spacing.xs },
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
  fullBar: { position: "absolute", flexDirection: "row", justifyContent: "space-between", alignItems: "center", opacity: 0.85 },
  fullComposer: { position: "absolute" },
  fullReactions: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  fullComposerInner: { backgroundColor: colors.scrim, borderRadius: radius.md, padding: spacing.sm, gap: spacing.xs },
  fullMsg: { fontFamily: fonts.regular, fontSize: 14, color: colors.onSurface },
  fullMsgMe: { color: colors.brandPrimary },
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
