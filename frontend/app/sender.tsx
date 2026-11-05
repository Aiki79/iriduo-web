import { Feather } from "@react-native-vector-icons/feather";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StageView } from "@/src/components/StageView";
import { ChatPanel, ChatToasts, newMessage, type ChatMessage } from "@/src/components/CallChat";
import { FloatingReactions, newReaction, ReactionBar, type FloatingReaction } from "@/src/components/Reactions";
import * as Haptics from "expo-haptics";
import { CallPill, CallStatsCard, formatDuration, quality, type CallStatsData } from "@/src/components/CallStats";
import { addCall, topQuality, type CallResult } from "@/src/history";
import type { Device, StageEvent, StageHandle } from "@/src/components/stage-types";
import { Btn, Chip, ChipRow, Header, Label, StatusBox, Toggle } from "@/src/components/ui";
import { addRecentCode, getRecentCodes } from "@/src/recent";
import { getContacts, nameFor, type Contact } from "@/src/contacts";
import { ChunkReceiver } from "@/src/media";
import { GuestsPanel } from "@/src/components/GuestsPanel";
import { blockedCodes, useSafety } from "@/src/components/Safety";
import { callsLeft, countCall, FREE_REACTIONS, FREE_RESOLUTION, isFreeRes, useProState } from "@/src/pro";
import { API_BASE } from "@/src/api";
import { tr, useLang } from "@/src/i18n";
import { colors, fonts, radius, spacing } from "@/src/theme";

const GUEST_MSG = (s: string) =>
  ({
    declined: tr("ha rifiutato", "declined"),
    noanswer: tr("nessuna risposta", "no answer"),
    failed: tr("collegamento non riuscito", "connection failed"),
    invalid: tr("il codice deve avere 6 cifre", "the code must have 6 digits"),
    duplicate: tr("è già nella chiamata", "is already in the call"),
    full: tr("massimo 3 visori aggiunti", "3 extra headsets maximum"),
    notLive: tr("avvia prima la chiamata", "start the call first"),
    ended: tr("ha chiuso", "hung up"),
    notfound: tr("codice non trovato (il visore deve essere aperto)", "code not found (the headset must be open)"),
  })[s] ?? tr("chiamata terminata", "call ended");

const isWeb = Platform.OS === "web";
const RESOLUTIONS = () => [
  { value: "3840x1920", label: tr("4K · consigliata", "4K · recommended") },
  { value: "3840x1080", label: tr("3840×1080 · webcam stereo USB", "3840×1080 · USB stereo webcam") },
  { value: "2880x1440", label: "2,9K" },
  { value: "1920x960", label: tr("HD · rete lenta", "HD · slow network") },
];
const BITRATES = () => [
  { value: 40000000, label: tr("Alta · 40 Mbit/s", "High · 40 Mbit/s") },
  { value: 20000000, label: tr("Media · 20 Mbit/s", "Medium · 20 Mbit/s") },
  { value: 10000000, label: tr("Bassa · 10 Mbit/s", "Low · 10 Mbit/s") },
];
const BAR_HEIGHT = 88;
const LEVELS = [5000000, 10000000, 20000000, 40000000];
// Stage status texts come in the app language: match both.
const CAM_READY = /^(Camera pronta|Camera ready)/;

function prettyLabel(l: string) {
  const s = l.toLowerCase();
  if (s.includes("front")) return tr("Frontale", "Front");
  const back = tr("Posteriore", "Back");
  if (s.includes("back") || s.includes("rear") || s.includes("environment")) return l.match(/\d+/) ? `${back} ${l.match(/\d+/)?.[0]}` : back;
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
      <Text style={styles.gateTitle}>{tr("Camera e microfono", "Camera and microphone")}</Text>
      <Text style={styles.gateText}>
        {tr("Servono per inviare il tuo video 3D e la tua voce al visore. Puoi usare la camera VR180 collegata al telefono o la fotocamera per una prova.", "They're needed to send your 3D video and your voice to the headset. You can use the VR180 camera connected to the phone, or the phone camera for a test.")}
      </Text>
      {blocked ? (
        <Btn testID="sender-open-settings-button" label={tr("Apri Impostazioni", "Open Settings")} icon="settings" variant="primary" onPress={() => Linking.openSettings()} />
      ) : (
        <Btn
          testID="sender-grant-permission-button"
          label={tr("Consenti camera e microfono", "Allow camera and microphone")}
          icon="check"
          variant="primary"
          onPress={async () => {
            if (!cam.granted) await reqCam();
            if (!mic.granted) await reqMic();
          }}
        />
      )}
      {blocked && <Text style={styles.gateHint}>{tr("Hai negato il permesso: abilitalo nelle impostazioni e torna qui.", "You denied the permission: enable it in settings and come back here.")}</Text>}
    </View>
  );
}

export default function Sender() {
  useLang();
  const [cam] = useCameraPermissions();
  const [mic] = useMicrophonePermissions();
  const granted = isWeb || (cam?.granted && mic?.granted);
  return (
    <View style={styles.root} testID="sender-screen">
      <Header title={tr("Trasmissione", "Broadcast")} />
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
  const router = useRouter();
  const proState = useProState();
  const pro = proState.pro;
  // Wide screens (computer, headset browser): keep the preview from pushing the controls off-screen.
  const { height: winH } = useWindowDimensions();
  const [res, setRes] = useState(FREE_RESOLUTION);
  useEffect(() => {
    if (proState.ready) setRes((r) => (pro ? (r === FREE_RESOLUTION ? "3840x1920" : r) : isFreeRes(r) ? r : FREE_RESOLUTION));
  }, [pro, proState.ready]);
  const [bitrate, setBitrate] = useState(20000000);
  const [code, setCode] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "calling" | "live">("idle");
  const [status, setStatus] = useState(tr("Avvio della camera…", "Starting camera…"));
  const [tone, setTone] = useState<"info" | "error" | "success">("info");
  const [resText, setResText] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stats, setStats] = useState<CallStatsData | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [autoQ, setAutoQ] = useState(true);
  const [effBitrate, setEffBitrate] = useState(20000000);
  const autoDoneRef = useRef(false);
  const lastStatusRef = useRef("");
  const pendingRef = useRef<{ code: string; at: number } | null>(null);
  const callRef = useRef<{ at: number; counts: Record<string, number> } | null>(null);
  const weakRef = useRef(0);
  const goodRef = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [guests, setGuests] = useState<Record<string, string>>({});
  const [online, setOnline] = useState<string[]>([]);
  const contactsRef = useRef<Contact[]>([]);
  contactsRef.current = contacts;
  const pollCodes = [...new Set([...contacts.map((c) => c.code), ...recent])].slice(0, 20).join(",");
  useEffect(() => {
    if (!pollCodes) return;
    let alive = true;
    const check = () =>
      fetch(`${API_BASE}/api/presence?codes=${pollCodes}`)
        .then((r) => r.json())
        .then((j) => alive && setOnline(Array.isArray(j.online) ? j.online : []))
        .catch(() => {});
    check();
    const id = setInterval(check, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollCodes]);
  useEffect(() => {
    if (phase === "idle") setGuests({});
  }, [phase]);
  const [recAt, setRecAt] = useState<number | null>(null);
  const [recNow, setRecNow] = useState(Date.now());
  const [mediaMsg, setMediaMsg] = useState<{ text: string; tone: "info" | "success" | "error" } | null>(null);
  const receiver = useRef(new ChunkReceiver());
  useEffect(() => {
    if (!recAt) return;
    const id = setInterval(() => setRecNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [recAt]);
  const sendChat = useCallback((text: string) => {
    const m = newMessage("me", text);
    setMessages((a) => [...a, m]);
    stage.current?.send({ type: "chat", text, id: m.id });
  }, []);
  const sendStage = useCallback((c: { type: string; [k: string]: unknown }) => stage.current?.send(c), []);
  const safety = useSafety("sender", sendStage, code);
  const safetyEvent = useRef(safety.onEvent);
  safetyEvent.current = safety.onEvent;
  const [floaters, setFloaters] = useState<FloatingReaction[]>([]);
  const removeFloater = useCallback((id: string) => setFloaters((a) => a.filter((f) => f.id !== id)), []);
  const addFloater = useCallback((kind: string) => setFloaters((a) => (a.length > 20 ? a : [...a, newReaction(kind)])), []);
  const lastReactRef = useRef(0);
  const lastBuzzRef = useRef(0);
  const react = useCallback(
    (kind: string) => {
      const now = Date.now();
      if (now - lastReactRef.current < 220) return; // same limit as the stage
      lastReactRef.current = now;
      stage.current?.send({ type: "react", kind });
      addFloater(kind);
    },
    [addFloater],
  );

  useEffect(() => {
    getRecentCodes().then(setRecent);
    getContacts().then(setContacts);
  }, []);

  const { code: linkCode } = useLocalSearchParams<{ code?: string }>();
  const linkRef = useRef<string | null>(null);
  useEffect(() => {
    if (linkCode && /^\d{6}$/.test(linkCode)) {
      linkRef.current = linkCode;
      setCode(linkCode);
      setStatus(tr(`Codice ${linkCode} ricevuto dal link: chiamo appena la camera è pronta.`, `Code ${linkCode} received from the link: calling as soon as the camera is ready.`));
      setTone("success");
    }
  }, [linkCode]);

  // Effective bitrate follows the chosen maximum when not in a call or when auto quality is off
  useEffect(() => {
    if (phase === "idle" || !autoQ) setEffBitrate(bitrate);
  }, [phase, autoQ, bitrate]);

  // Auto quality: step down after 2 weak readings, back up after 5 good ones (readings every 2s)
  useEffect(() => {
    if (!stats || !autoQ || phase !== "live") return;
    const q = quality(stats).label;
    if (q === "Debole") {
      goodRef.current = 0;
      weakRef.current += 1;
      if (weakRef.current >= 2) {
        weakRef.current = 0;
        setEffBitrate((b) => [...LEVELS].reverse().find((l) => l < b) ?? b);
      }
    } else if (q === "Buona") {
      weakRef.current = 0;
      goodRef.current += 1;
      if (goodRef.current >= 5) {
        goodRef.current = 0;
        setEffBitrate((b) => {
          const up = LEVELS.find((l) => l > b);
          return up && up <= bitrate ? up : b;
        });
      }
    } else {
      weakRef.current = 0;
      goodRef.current = 0;
    }
  }, [stats, autoQ, phase, bitrate]);

  // Direct link: call automatically once the camera is ready
  useEffect(() => {
    const target = linkRef.current;
    if (!camReady || !target || autoDoneRef.current || phase !== "idle" || code !== target) return;
    autoDoneRef.current = true;
    if (callsLeft(proState) === 0) {
      setStatus(tr("Hai finito le chiamate gratuite di questo mese. Passa a Pro per chiamare ancora.", "You've used this month's free calls. Upgrade to Pro to keep calling."));
      setTone("error");
      return;
    }
    setStatus(tr(`Chiamo automaticamente il visore ${target}…`, `Automatically calling headset ${target}…`));
    setTone("info");
    pendingRef.current = { code: target, at: Date.now() };
    addRecentCode(target).then(setRecent);
    stage.current?.send({ type: "call", code: target });
  }, [camReady, phase, code, proState]);

  const sendConfig = useCallback(() => {
    if (camId) stage.current?.send({ type: "config", cfg: { cam: camId, mic: micId, res, bitrate: effBitrate } });
  }, [camId, micId, res, effBitrate]);
  useEffect(sendConfig, [sendConfig]);

  const onEvent = useCallback(
    (e: StageEvent) => {
      if (safetyEvent.current(e)) return;
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
          setResText(tr(`Risoluzione effettiva: ${e.w} × ${e.h}${e.w < e.requested ? " (la camera non supporta quella richiesta)" : ""}`, `Actual resolution: ${e.w} × ${e.h}${e.w < e.requested ? " (the camera doesn't support the requested one)" : ""}`));
          break;
        case "status":
          lastStatusRef.current = e.text;
          if (CAM_READY.test(e.text)) setCamReady(true);
          if (linkRef.current && CAM_READY.test(e.text)) {
            if (!autoDoneRef.current) break; // auto call effect sets its own status
            setStatus(tr(`Camera pronta. Codice ${linkRef.current} ricevuto dal link: tocca Chiama.`, `Camera ready. Code ${linkRef.current} received from the link: tap Call.`));
            setTone("success");
            break;
          }
          setStatus(e.text);
          setTone(/errore|non |negato|error|not |denied|can't|won't|failed/i.test(e.text) ? "error" : /collegato|connected/i.test(e.text) ? "success" : "info");
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
          if (!callRef.current) {
            countCall();
            callRef.current = { at: Date.now(), counts: {} };
            setMessages([]);
          }
          break;
        case "chat":
          setMessages((a) => [...a, newMessage("them", e.text, e.from ? nameFor(contactsRef.current, e.from) ?? tr(`Visore ${e.from}`, `Headset ${e.from}`) : undefined)]);
          break;
        case "recStarted":
          setRecAt(Date.now());
          setRecNow(Date.now());
          setMediaMsg({ text: tr("Registrazione in corso (massimo 5 minuti).", "Recording (5 minutes max)."), tone: "info" });
          break;
        case "recError":
          setRecAt(null);
          setMediaMsg({ text: e.text, tone: "error" });
          break;
        case "recSaved":
          setRecAt(null);
          setMediaMsg({ text: tr(`Registrazione salvata: ${e.name}`, `Recording saved: ${e.name}`), tone: "success" });
          break;
        case "recChunk":
          if (e.i === 0) {
            setRecAt(null);
            setMediaMsg({ text: tr("Preparo il video registrato…", "Preparing the recorded video…"), tone: "info" });
          }
          receiver.current.push(e.i, e.n, e.name, e.data, e.mime, (ok) =>
            setMediaMsg(ok ? { text: tr(`Registrazione pronta: ${e.name}`, `Recording ready: ${e.name}`), tone: "success" } : { text: tr("Non sono riuscito a salvare la registrazione.", "Couldn't save the recording."), tone: "error" }),
          );
          break;
        case "guest":
          setGuests((g) => {
            if (e.state === "duplicate" || e.state === "full" || e.state === "notLive" || e.state === "invalid") {
              if (g[e.code] !== "adding") return g;
            }
            const next = { ...g };
            if (["ringing", "connected"].includes(e.state)) next[e.code] = e.state;
            else delete next[e.code];
            return next;
          });
          if (e.state === "promoted") {
            setMediaMsg({ text: tr(`Il visore principale ha chiuso: continui a trasmettere a ${e.code}.`, `The main headset hung up: you keep broadcasting to ${e.code}.`), tone: "info" });
            break;
          }
          if (!["ringing", "connected", "removed"].includes(e.state)) {
            setMediaMsg({ text: `${tr("Visore", "Headset")} ${e.code}: ${GUEST_MSG(e.state)}.`, tone: e.state === "ended" ? "info" : "error" });
          }
          break;
        case "react":
          addFloater(e.kind);
          if (Platform.OS !== "web" && Date.now() - lastBuzzRef.current > 600) {
            lastBuzzRef.current = Date.now();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          break;
        case "chatError":
          setMessages((a) => a.map((m) => (m.id === e.id ? { ...m, failed: true } : m)));
          break;
        case "ended": {
          setPhase("idle");
          setStartedAt(null);
          setStats(null);
          const c = callRef.current;
          const p = pendingRef.current;
          if (p && c) {
            addCall({ role: "out", code: p.code, at: c.at, duration: Date.now() - c.at, quality: topQuality(c.counts), result: "completata" });
          } else if (p) {
            const s = lastStatusRef.current;
            const result: CallResult = /rifiutata|declined|rejected/i.test(s) ? "rifiutata" : /nessuna risposta|no answer/i.test(s) ? "senza-risposta" : /non trovato|not found/i.test(s) ? "non-trovato" : "annullata";
            addCall({ role: "out", code: p.code, at: p.at, duration: 0, quality: null, result });
          }
          callRef.current = null;
          pendingRef.current = null;
          break;
        }
        case "stats":
          setStats(e);
          if (callRef.current) {
            const l = quality(e).label;
            callRef.current.counts[l] = (callRef.current.counts[l] ?? 0) + 1;
          }
          break;
      }
    },
    [sendConfig, addFloater],
  );

  const valid = /^\d{6}$/.test(code);
  const busy = phase !== "idle";

  const call = async (target?: string) => {
    const c = target ?? code;
    if (!/^\d{6}$/.test(c)) {
      setStatus(tr("Il codice deve avere 6 cifre.", "The code must have 6 digits."));
      setTone("error");
      return;
    }
    if (target) setCode(target);
    if ((await blockedCodes()).includes(c)) {
      setStatus(tr("Hai bloccato questo codice: non puoi chiamarlo.", "You blocked this code: you can't call it."));
      setTone("error");
      return;
    }
    if (callsLeft(proState) === 0) {
      router.push("/pro");
      return;
    }
    setRecent(await addRecentCode(c));
    pendingRef.current = { code: c, at: Date.now() };
    stage.current?.send({ type: "call", code: c });
  };

  const waiting = [...new Set([...contacts.map((c) => c.code), ...recent])].filter((c) => online.includes(c));

  return (
    <View style={styles.flex}>
      <View style={[styles.preview, { maxHeight: Math.round(winH * 0.45) }]} testID="sender-preview-container">
        <StageView ref={stage} mode="sender" onEvent={onEvent} testID="sender-preview" />
        {phase === "live" ? <ChatToasts messages={messages} testID="sender-chat-toasts" /> : null}
        {phase === "live" ? <FloatingReactions items={floaters} onDone={removeFloater} testID="sender-floating-reactions" /> : null}
        {phase === "live" && (
          <View style={styles.liveBadge} testID="sender-live-badge">
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{tr("IN ONDA", "LIVE")}</Text>
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
        {safety.banner}
        {phase === "live" && startedAt ? (
          <View style={styles.statsWrap}>
            <CallStatsCard startedAt={startedAt} stats={stats} direction="out" testID="sender-call-stats" />
          </View>
        ) : null}
        {phase === "live" && autoQ && effBitrate < bitrate ? (
          <View style={styles.statsWrap}>
            <StatusBox
              testID="sender-auto-quality-notice"
              tone="warning"
              text={tr(`Qualità automatica: invio ridotto a ${effBitrate / 1e6} Mbit/s per la connessione debole. Risalirà da sola quando migliora.`, `Auto quality: sending reduced to ${effBitrate / 1e6} Mbit/s because of a weak connection. It will go back up by itself when it improves.`)}
            />
          </View>
        ) : null}
        {phase === "live" ? (
          <GuestsPanel
            guests={guests}
            onAdd={(c) => {
              if (guests[c]) {
                setMediaMsg({ text: tr(`Visore ${c}: è già nella chiamata.`, `Headset ${c}: already in the call.`), tone: "error" });
                return;
              }
              setGuests((g) => ({ ...g, [c]: "adding" }));
              addRecentCode(c).then(setRecent);
              stage.current?.send({ type: "addGuest", code: c });
            }}
            onRemove={(c) => stage.current?.send({ type: "removeGuest", code: c })}
            names={contacts.filter((c) => c.code !== pendingRef.current?.code)}
            online={online.filter((c) => c !== pendingRef.current?.code)}
          />
        ) : null}
        {phase === "live" ? (
          <View style={styles.statsWrap}>
            <Label>{tr("Registrazione", "Recording")}</Label>
            <Btn
              compact
              testID="sender-record-button"
              label={recAt ? tr(`Ferma ${formatDuration(recNow - recAt)}`, `Stop ${formatDuration(recNow - recAt)}`) : pro ? tr("Registra la tua trasmissione", "Record your broadcast") : tr("Registra · solo con Pro", "Record · Pro only")}
              icon={recAt ? "stop-circle" : pro ? "circle" : "lock"}
              variant={recAt ? "danger" : "secondary"}
              onPress={() => (!pro ? router.push("/pro") : stage.current?.send({ type: recAt ? "recStop" : "recStart" }))}
            />
          </View>
        ) : null}
        {mediaMsg ? (
          <View style={styles.statsWrap}>
            <StatusBox testID="sender-media-status" text={mediaMsg.text} tone={mediaMsg.tone} />
          </View>
        ) : null}
        {phase === "live" ? (
          <View style={styles.statsWrap}>
            {safety.ui}
            <Label>{tr("Reazioni", "Reactions")}</Label>
            <ReactionBar onReact={react} testID="sender-reactions" unlocked={pro ? undefined : FREE_REACTIONS} onLocked={() => router.push("/pro")} />
          </View>
        ) : null}
        {phase === "live" ? (
          <View style={styles.chatWrap}>
            <ChatPanel messages={messages} onSend={sendChat} testID="sender-chat" />
          </View>
        ) : null}

        {!busy && waiting.length > 0 ? (
          <View testID="sender-waiting">
            <Label>{tr("In attesa ora · tocca per chiamare", "Waiting now · tap to call")}</Label>
            <ChipRow testID="sender-waiting-chips">
              {waiting.map((c) => (
                <Chip key={c} testID={`sender-waiting-${c}`} icon="radio" label={nameFor(contacts, c) ?? c} selected={false} onPress={() => call(c)} />
              ))}
            </ChipRow>
          </View>
        ) : null}
        <Label>{tr("Codice mostrato sul visore", "Code shown on the headset")}</Label>
        <TextInput
          testID="sender-code-input"
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
          placeholder={tr("6 cifre", "6 digits")}
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          maxLength={6}
          editable={!busy}
          returnKeyType="done"
          style={[styles.input, valid && styles.inputValid]}
        />
        {contacts.length > 0 && (
          <ChipRow testID="sender-contact-chips">
            {contacts.map((c) => (
              <Chip key={c.code} testID={`sender-contact-${c.code}`} icon="user" label={c.name} selected={code === c.code} onPress={() => !busy && setCode(c.code)} />
            ))}
          </ChipRow>
        )}
        {recent.filter((c) => !nameFor(contacts, c)).length > 0 && (
          <ChipRow testID="sender-recent-codes">
            {recent
              .filter((c) => !nameFor(contacts, c))
              .map((c) => (
                <Chip key={c} testID={`sender-recent-code-${c}`} icon="clock" label={c} selected={code === c} onPress={() => !busy && setCode(c)} />
              ))}
          </ChipRow>
        )}

        <View style={[styles.warn]} testID="sender-camera-warning">
          <Feather name="alert-triangle" size={18} color={colors.warning} />
          <Text style={styles.warnText}>
            {isWeb
              ? tr("La camera VR180 o stereo deve inviare l’immagine già unita (due metà affiancate). Collegala al computer come webcam USB e sceglila qui sotto.", "The VR180 or stereo camera must send the image already joined (two halves side by side). Connect it to the computer as a USB webcam and pick it below.")
              : tr("La camera VR180 deve inviare l’immagine già unita (due metà affiancate). Collegala al telefono come webcam USB, oppure usa la fotocamera per una prova.", "The VR180 camera must send the image already joined (two halves side by side). Connect it to the phone as a USB webcam, or use the phone camera for a test.")}
          </Text>
        </View>

        <View pointerEvents={busy ? "none" : "auto"} style={busy && styles.dim}>
          <Label>Camera</Label>
          <ChipRow testID="sender-camera-chips">
            {cams.length === 0 && <Text style={styles.small}>{tr("Ricerca camere…", "Looking for cameras…")}</Text>}
            {cams.map((c, i) => (
              <Chip key={c.id} testID={`sender-camera-chip-${i}`} icon="camera" label={prettyLabel(c.label)} selected={camId === c.id} onPress={() => setCamId(c.id)} />
            ))}
          </ChipRow>
          <Label>{tr("Microfono", "Microphone")}</Label>
          <ChipRow testID="sender-mic-chips">
            {mics.length === 0 && <Text style={styles.small}>{tr("Ricerca microfoni…", "Looking for microphones…")}</Text>}
            {mics.map((m, i) => (
              <Chip key={m.id} testID={`sender-mic-chip-${i}`} icon="mic" label={m.label} selected={micId === m.id} onPress={() => setMicId(m.id)} />
            ))}
          </ChipRow>
          <Label>{tr("Risoluzione", "Resolution")}</Label>
          <ChipRow testID="sender-resolution-chips">
            {RESOLUTIONS().map((r) => (
              <Chip
                key={r.value}
                testID={`sender-resolution-${r.value}`}
                icon={!pro && !isFreeRes(r.value) ? "lock" : undefined}
                label={!pro && !isFreeRes(r.value) ? `${r.label.split(" ·")[0]} · Pro` : r.label}
                selected={res === r.value}
                onPress={() => (!pro && !isFreeRes(r.value) ? router.push("/pro") : setRes(r.value))}
              />
            ))}
          </ChipRow>
        </View>
        <Label>{tr("Qualità di invio", "Sending quality")}</Label>
        <ChipRow testID="sender-bitrate-chips">
          {BITRATES().map((b) => (
            <Chip key={b.value} testID={`sender-bitrate-${b.value}`} label={b.label} selected={bitrate === b.value} onPress={() => setBitrate(b.value)} />
          ))}
        </ChipRow>
        <Toggle
          testID="sender-auto-quality-toggle"
          label={tr("Qualità automatica", "Auto quality")}
          hint={tr("Abbassa l’invio se la connessione è debole, poi lo rialza", "Lowers sending when the connection is weak, then raises it again")}
          value={autoQ}
          onChange={setAutoQ}
        />
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ opened: insets.bottom }} style={[styles.bar, { paddingBottom: insets.bottom + spacing.lg }]}>
        {busy ? (
          <Btn
            testID="sender-hangup-button"
            label={phase === "calling" ? tr("Annulla chiamata", "Cancel call") : tr("Chiudi chiamata", "End call")}
            icon="phone-off"
            variant="danger"
            onPress={() => stage.current?.send({ type: "hangup" })}
          />
        ) : (
          <Btn testID="sender-call-button" label={tr("Chiama", "Call")} icon="phone-call" variant="primary" disabled={!valid} onPress={() => call()} />
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
  chatWrap: { marginBottom: spacing.xl },
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
