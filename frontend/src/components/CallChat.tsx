import { Feather } from "@react-native-vector-icons/feather";
import { useEffect, useRef, useState } from "react";
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";

import { Chip, ChipRow } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";

export type ChatMessage = { id: string; from: "me" | "them"; text: string; at: number; failed?: boolean; label?: string };

export const QUICK_REPLIES = ["Ti vedo bene", "Non ti sento", "Avvicinati", "Allontanati", "Va bene!", "Un attimo…"];

export const newMessage = (from: "me" | "them", text: string, label?: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  from,
  text,
  at: Date.now(),
  label,
});

function Bubble({ m, testID }: { m: ChatMessage; testID: string }) {
  const me = m.from === "me";
  return (
    <View style={[styles.bubble, me ? styles.me : styles.them]} testID={testID}>
      {!me && m.label ? <Text style={styles.label}>{m.label}</Text> : null}
      <Text style={[styles.bubbleText, { color: me ? colors.onBrandPrimary : colors.onSurface }]}>{m.text}</Text>
      {m.failed ? <Text style={styles.failed}>Non inviato</Text> : null}
    </View>
  );
}

/** Quick replies + text field + send button. */
export function ChatComposer({ onSend, testID, autoFocus }: { onSend: (t: string) => void; testID: string; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };
  return (
    <View>
      <ChipRow testID={`${testID}-quick`}>
        {QUICK_REPLIES.map((q, i) => (
          <Chip key={q} testID={`${testID}-quick-${i}`} label={q} selected={false} onPress={() => onSend(q)} />
        ))}
      </ChipRow>
      <View style={styles.inputRow}>
        <TextInput
          testID={`${testID}-input`}
          value={text}
          onChangeText={setText}
          placeholder="Scrivi un messaggio…"
          placeholderTextColor={colors.muted}
          maxLength={300}
          returnKeyType="send"
          onSubmitEditing={submit}
          blurOnSubmit={false}
          autoFocus={autoFocus}
          style={styles.input}
        />
        <Pressable
          testID={`${testID}-send-button`}
          accessibilityLabel="Invia messaggio"
          onPress={submit}
          disabled={!text.trim()}
          style={({ pressed }) => [styles.send, !text.trim() && styles.disabled, pressed && styles.pressed]}
        >
          <Feather name="send" size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

/** Card with the latest messages and the composer (normal, non-fullscreen view). */
export function ChatPanel({ messages, onSend, testID }: { messages: ChatMessage[]; onSend: (t: string) => void; testID: string }) {
  const last = messages.slice(-50);
  const ref = useRef<ScrollView>(null);
  const atBottom = useRef(true);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    atBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
  };
  return (
    <View style={styles.panel} testID={testID}>
      <View style={styles.panelHead}>
        <Feather name="message-circle" size={18} color={colors.brandPrimary} />
        <Text style={styles.panelTitle}>Messaggi</Text>
      </View>
      {last.length === 0 ? (
        <Text style={styles.empty}>Nessun messaggio. Usa le risposte rapide per parlare senza interrompere il 3D.</Text>
      ) : (
        <ScrollView
          ref={ref}
          style={styles.scroll}
          contentContainerStyle={styles.list}
          nestedScrollEnabled
          onScroll={onScroll}
          scrollEventThrottle={64}
          onContentSizeChange={() => atBottom.current && ref.current?.scrollToEnd({ animated: false })}
          testID={`${testID}-list`}
        >
          {last.map((m) => (
            <Bubble key={m.id} m={m} testID={`${testID}-msg-${m.from}`} />
          ))}
        </ScrollView>
      )}
      <ChatComposer onSend={onSend} testID={`${testID}-composer`} />
    </View>
  );
}

/** Incoming messages floating over the video for a few seconds. In split mode they appear in both eyes. */
export function ChatToasts({ messages, split, testID, bottom }: { messages: ChatMessage[]; split?: boolean; testID: string; bottom?: number }) {
  const [now, setNow] = useState(Date.now());
  const recent = messages.filter((m) => m.from === "them" && now - m.at < 8000).slice(-2);
  useEffect(() => {
    if (recent.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [recent.length]);
  useEffect(() => setNow(Date.now()), [messages.length]);
  if (recent.length === 0) return null;
  const stack = (key: string) => (
    <View key={key} style={styles.toastCol}>
      {recent.map((m) => (
        <Animated.View key={m.id} entering={FadeInUp.duration(250)} exiting={FadeOut} style={styles.toast}>
          <Feather name="message-circle" size={14} color={colors.brandPrimary} />
          <Text style={styles.toastText} numberOfLines={3}>
            {m.label ? `${m.label}: ` : ""}
            {m.text}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
  return (
    <View pointerEvents="none" style={[styles.toasts, bottom !== undefined && { bottom }]} testID={testID}>
      {split ? [stack("l"), stack("r")] : stack("c")}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm },
  panelHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  panelTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, lineHeight: 20 },
  scroll: { maxHeight: 240, marginBottom: spacing.sm },
  list: { gap: spacing.xs },
  bubble: { maxWidth: "85%", flexShrink: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  me: { alignSelf: "flex-end", backgroundColor: colors.brandPrimary },
  them: { alignSelf: "flex-start", backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: fonts.bold, fontSize: 12, color: colors.brandPrimary, marginBottom: 2 },
  failed: { fontFamily: fonts.bold, fontSize: 11, color: colors.error, marginTop: 2 },
  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.onSurface,
  },
  send: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  toasts: { position: "absolute", left: 0, right: 0, bottom: spacing.xl, flexDirection: "row", justifyContent: "space-around" },
  toastCol: { flex: 1, alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.md },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: 420,
    backgroundColor: colors.scrim,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toastText: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.onSurface },
});
