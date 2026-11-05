import { Feather } from "@react-native-vector-icons/feather";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { Fisheye } from "@/src/components/FisheyePanel";
import { Btn } from "@/src/components/ui";
import { deleteProfile, sameFe, saveProfile, useProfiles } from "@/src/profiles";
import { colors, fonts, radius, spacing } from "@/src/theme";

/** Saved calibrations, one per camera: tap a name to apply it, save the current values under a name. */
export function CameraProfiles({ value, onApply }: { value: Fisheye; onApply: (fe: Fisheye) => void }) {
  const [list, setList] = useProfiles();
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const valid = name.trim().length > 0;

  return (
    <View style={styles.wrap} testID="viewer-profiles">
      <Text style={styles.title}>Profili camera</Text>
      {list.length === 0 ? <Text style={styles.empty}>Nessun profilo salvato. Regola i cerchi e salva le impostazioni con il nome della camera.</Text> : null}
      {list.map((p) => {
        const active = sameFe(p.fe, value);
        return (
          <View key={p.id} style={[styles.row, active && styles.rowOn]} testID={`viewer-profile-${p.name}`}>
            <Pressable
              testID={`viewer-profile-apply-${p.name}`}
              accessibilityRole="button"
              accessibilityLabel={`Usa il profilo ${p.name}`}
              onPress={() => onApply(p.fe)}
              style={({ pressed }) => [styles.apply, pressed && styles.pressed]}
            >
              <Feather name={active ? "check-circle" : "camera"} size={18} color={active ? colors.brandPrimary : colors.muted} />
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {`${p.fe.fov}° · cerchio ${p.fe.raggio}% · centro ${p.fe.dx}/${p.fe.dy} px`}
                </Text>
              </View>
            </Pressable>
            {confirm === p.id ? (
              <>
                <Pressable testID={`viewer-profile-cancel-delete-${p.name}`} accessibilityLabel="Annulla eliminazione" onPress={() => setConfirm(null)} style={styles.del}>
                  <Feather name="x" size={18} color={colors.muted} />
                </Pressable>
                <Pressable
                  testID={`viewer-profile-confirm-delete-${p.name}`}
                  accessibilityLabel={`Conferma eliminazione ${p.name}`}
                  onPress={async () => {
                    setList(await deleteProfile(p.id));
                    setConfirm(null);
                  }}
                  style={styles.delConfirm}
                >
                  <Text style={styles.delText}>Elimina</Text>
                </Pressable>
              </>
            ) : (
              <Pressable testID={`viewer-profile-delete-${p.name}`} accessibilityLabel={`Elimina ${p.name}`} onPress={() => setConfirm(p.id)} style={styles.del}>
                <Feather name="trash-2" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
        );
      })}
      <View style={styles.saveRow}>
        <TextInput
          testID="viewer-profile-name-input"
          value={name}
          onChangeText={setName}
          placeholder="Nome camera, es. ELP salotto"
          placeholderTextColor={colors.muted}
          maxLength={30}
          style={styles.input}
          returnKeyType="done"
        />
        <Btn
          compact
          testID="viewer-profile-save-button"
          label="Salva"
          icon="save"
          variant="primary"
          disabled={!valid}
          onPress={async () => {
            setList(await saveProfile(name, value));
            setName("");
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted, letterSpacing: 0.6, textTransform: "uppercase" },
  empty: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, overflow: "hidden" },
  rowOn: { borderColor: colors.brandPrimary },
  apply: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 56 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  del: { width: 48, height: 56, alignItems: "center", justifyContent: "center" },
  delConfirm: { width: 80, height: 56, flexShrink: 0, alignItems: "center", justifyContent: "center", backgroundColor: colors.error },
  delText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onSurface },
  saveRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  input: { flex: 1, minWidth: 0, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.md, fontFamily: fonts.regular, fontSize: 16, color: colors.onSurface },
  pressed: { opacity: 0.85 },
});
