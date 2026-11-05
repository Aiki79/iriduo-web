import { Feather } from "@react-native-vector-icons/feather";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Label } from "@/src/components/ui";
import { tr } from "@/src/i18n";
import { nameFor, type Contact } from "@/src/contacts";
import { colors, fonts, radius, spacing } from "@/src/theme";

const STATE_LABEL = (s: string) => ({ adding: tr("Chiamo…", "Calling…"), ringing: tr("Squilla…", "Ringing…"), connected: tr("Sta guardando", "Watching") })[s] ?? s;

/** Invite up to 3 more viewers to watch the same live broadcast. */
export function GuestsPanel({ guests, onAdd, onRemove, names, online = [] }: { guests: Record<string, string>; onAdd: (code: string) => void; onRemove: (code: string) => void; names: Contact[]; online?: string[] }) {
  const [code, setCode] = useState("");
  const list = Object.entries(guests);
  const full = list.length >= 3;
  const valid = /^\d{6}$/.test(code);
  const add = () => {
    if (!valid || full) return;
    onAdd(code);
    setCode("");
  };
  const pool: Contact[] = [...names, ...online.filter((c) => !nameFor(names, c)).map((c) => ({ code: c, name: c }))];
  const suggestions = pool
    .filter((c) => !guests[c.code])
    .sort((a, b) => Number(online.includes(b.code)) - Number(online.includes(a.code)))
    .slice(0, 6);

  return (
    <View style={styles.panel} testID="sender-guests">
      <Label>{tr(`Altri visori (${list.length}/3)`, `More headsets (${list.length}/3)`)}</Label>
      <Text style={styles.hint}>{tr("Invita fino a 3 persone in più a guardare la stessa trasmissione 3D.", "Invite up to 3 more people to watch the same 3D broadcast.")}</Text>
      {list.map(([c, s]) => (
        <View key={c} style={styles.row} testID={`sender-guest-${c}`}>
          <View style={[styles.dot, { backgroundColor: s === "connected" ? colors.success : colors.warning }]} />
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {nameFor(names, c) ?? c}
            </Text>
            <Text style={styles.state} testID={`sender-guest-state-${c}`}>
              {STATE_LABEL(s)}
            </Text>
          </View>
          <Pressable testID={`sender-guest-remove-${c}`} accessibilityLabel={tr("Togli dalla chiamata", "Remove from call")} onPress={() => onRemove(c)} style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
            <Feather name="x" size={18} color={colors.onError} />
          </Pressable>
        </View>
      ))}
      {!full && (
        <>
          {suggestions.length > 0 && (
            <View style={styles.sugg}>
              {suggestions.map((c) => (
                <Pressable key={c.code} testID={`sender-guest-contact-${c.code}`} onPress={() => onAdd(c.code)} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                  {online.includes(c.code) ? <View style={[styles.dot, { backgroundColor: colors.success }]} testID={`sender-guest-online-${c.code}`} /> : null}
                  <Feather name="user-plus" size={14} color={colors.brandPrimary} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              testID="sender-guest-code-input"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder={tr("Codice di un altro visore", "Another headset's code")}
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={add}
              style={styles.input}
            />
            <Pressable testID="sender-guest-add-button" accessibilityLabel={tr("Invita", "Invite")} onPress={add} disabled={!valid} style={({ pressed }) => [styles.add, !valid && styles.disabled, pressed && styles.pressed]}>
              <Feather name="user-plus" size={20} color={colors.onBrandPrimary} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  panel: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingBottom: spacing.md, marginTop: spacing.sm, gap: spacing.sm },
  hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  state: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  remove: { width: 44, height: 44, flexShrink: 0, borderRadius: radius.md, backgroundColor: colors.error, alignItems: "center", justifyContent: "center" },
  sugg: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, height: 44, maxWidth: "100%", paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary },
  chipText: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.onSurface },
  inputRow: { flexDirection: "row", gap: spacing.sm },
  input: { flex: 1, minWidth: 0, minHeight: 48, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontFamily: fonts.bold, fontSize: 17, letterSpacing: 2, color: colors.onSurface },
  add: { width: 48, height: 48, flexShrink: 0, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
