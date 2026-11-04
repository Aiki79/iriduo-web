import { Feather } from "@react-native-vector-icons/feather";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, Header, Label } from "@/src/components/ui";
import { getContacts, removeContact, upsertContact, type Contact } from "@/src/contacts";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function Contacts() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { code: preCode } = useLocalSearchParams<{ code?: string }>();
  const [list, setList] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getContacts().then(setList);
    }, []),
  );
  useEffect(() => {
    if (preCode && /^\d{6}$/.test(preCode)) setCode(preCode);
  }, [preCode]);

  const save = async () => {
    if (!name.trim()) return setError("Scrivi un nome.");
    if (!/^\d{6}$/.test(code)) return setError("Il codice deve avere 6 cifre.");
    setError("");
    const existing = list.find((c) => c.code === code);
    setList(await upsertContact({ name: name.trim().slice(0, 40), code }));
    setNotice(existing ? `Codice ${code}: nome aggiornato da "${existing.name}" a "${name.trim()}".` : `${name.trim()} salvato in rubrica.`);
    setName("");
    setCode("");
  };

  return (
    <View style={styles.root} testID="contacts-screen">
      <Header title="Rubrica" />
      <KeyboardAwareScrollView
        bottomOffset={spacing.lg}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.form}>
          <Label>Nuovo contatto</Label>
          <TextInput
            testID="contacts-name-input"
            value={name}
            onChangeText={setName}
            placeholder="Nome, es. Marco"
            placeholderTextColor={colors.muted}
            maxLength={40}
            style={styles.input}
            returnKeyType="next"
          />
          <TextInput
            testID="contacts-code-input"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="Codice (6 cifre)"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={6}
            style={[styles.input, styles.codeInput]}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          {error ? (
            <Text style={styles.error} testID="contacts-error">
              {error}
            </Text>
          ) : null}
          {notice ? (
            <Text style={styles.notice} testID="contacts-notice">
              {notice}
            </Text>
          ) : null}
          <Btn testID="contacts-save-button" label="Salva in rubrica" icon="user-plus" variant="primary" onPress={save} />
          <Text style={styles.hint}>Il codice del visore cambia a ogni apertura: aggiornalo quando il tuo contatto te ne manda uno nuovo.</Text>
        </View>

        <Label>Contatti</Label>
        {list.length === 0 ? (
          <Text style={styles.hint} testID="contacts-empty">
            Nessun contatto. Salva qui sopra chi chiami spesso.
          </Text>
        ) : (
          list.map((c) => (
            <View key={c.code} style={styles.row} testID={`contacts-row-${c.code}`}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{c.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.code}>{c.code}</Text>
              </View>
              <Pressable
                testID={`contacts-delete-${c.code}`}
                accessibilityLabel={confirmDel === c.code ? `Conferma eliminazione di ${c.name}` : `Elimina ${c.name}`}
                onPress={async () => {
                  if (confirmDel !== c.code) return setConfirmDel(c.code);
                  setConfirmDel(null);
                  setList(await removeContact(c.code));
                }}
                style={({ pressed }) => [styles.iconBtn, confirmDel === c.code && styles.delConfirm, pressed && styles.pressed]}
              >
                {confirmDel === c.code ? (
                  <Text style={styles.delText}>Sicuro?</Text>
                ) : (
                  <Feather name="trash-2" size={18} color={colors.error} />
                )}
              </Pressable>
              <Pressable
                testID={`contacts-call-${c.code}`}
                accessibilityLabel={`Chiama ${c.name}`}
                onPress={() => router.push({ pathname: "/sender", params: { code: c.code } })}
                style={({ pressed }) => [styles.call, pressed && styles.pressed]}
              >
                <Feather name="phone-call" size={18} color={colors.onBrandPrimary} />
              </Pressable>
            </View>
          ))
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  form: { gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, paddingTop: 0 },
  input: {
    minHeight: 52,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.onSurface,
  },
  codeInput: { fontFamily: fonts.bold, letterSpacing: 4 },
  error: { fontFamily: fonts.bold, fontSize: 14, color: colors.error },
  notice: { fontFamily: fonts.bold, fontSize: 14, color: colors.success },
  delConfirm: { width: 76, backgroundColor: colors.error },
  delText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onError },
  hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, fontSize: 18, color: colors.brandPrimary },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.onSurface },
  code: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, letterSpacing: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  call: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandPrimary },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
