import { Feather } from "@react-native-vector-icons/feather";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Avatar } from "@/src/components/Warm";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, Header, Label } from "@/src/components/ui";
import { getContacts, removeContact, upsertContact, type Contact } from "@/src/contacts";
import { tr, useLang } from "@/src/i18n";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function Contacts() {
  useLang();
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
    if (!name.trim()) return setError(tr("Scrivi un nome.", "Enter a name."));
    if (!/^\d{6}$/.test(code)) return setError(tr("Il codice deve avere 6 cifre.", "The code must have 6 digits."));
    setError("");
    const existing = list.find((c) => c.code === code);
    setList(await upsertContact({ name: name.trim().slice(0, 40), code }));
    setNotice(
      existing
        ? tr(`Codice ${code}: nome aggiornato da "${existing.name}" a "${name.trim()}".`, `Code ${code}: name changed from "${existing.name}" to "${name.trim()}".`)
        : tr(`${name.trim()} salvato in rubrica.`, `${name.trim()} saved to your address book.`),
    );
    setName("");
    setCode("");
  };

  return (
    <View style={styles.root} testID="contacts-screen">
      <Header title={tr("Rubrica", "Address book")} />
      <KeyboardAwareScrollView
        bottomOffset={spacing.lg}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.form}>
          <Label>{tr("Nuovo contatto", "New contact")}</Label>
          <TextInput
            testID="contacts-name-input"
            value={name}
            onChangeText={setName}
            placeholder={tr("Nome, es. Marco", "Name, e.g. Mark")}
            placeholderTextColor={colors.muted}
            maxLength={40}
            style={styles.input}
            returnKeyType="next"
          />
          <TextInput
            testID="contacts-code-input"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            placeholder={tr("Codice (6 cifre)", "Code (6 digits)")}
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
          <Btn testID="contacts-save-button" label={tr("Salva in rubrica", "Save contact")} icon="user-plus" variant="primary" onPress={save} />
          <Text style={styles.hint}>{tr("Se il visore ha un codice che cambia, aggiornalo qui quando il tuo contatto te ne manda uno nuovo (oppure chiedigli di attivare \"Tieni sempre questo codice\").", "If the headset's code changes, update it here when your contact sends you a new one (or ask them to turn on \"Always keep this code\").")}</Text>
        </View>

        <Label>{tr("Contatti", "Contacts")}</Label>
        {list.length === 0 ? (
          <Text style={styles.hint} testID="contacts-empty">
            {tr("Nessun contatto. Salva qui sopra chi chiami spesso.", "No contacts yet. Save the people you call often above.")}
          </Text>
        ) : (
          list.map((c) => (
            <View key={c.code} style={styles.row} testID={`contacts-row-${c.code}`}>
              <Avatar name={c.name} />
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.code}>{c.code}</Text>
              </View>
              <Pressable
                testID={`contacts-delete-${c.code}`}
                accessibilityLabel={confirmDel === c.code ? tr(`Conferma eliminazione di ${c.name}`, `Confirm deleting ${c.name}`) : tr(`Elimina ${c.name}`, `Delete ${c.name}`)}
                onPress={async () => {
                  if (confirmDel !== c.code) return setConfirmDel(c.code);
                  setConfirmDel(null);
                  setList(await removeContact(c.code));
                }}
                style={({ pressed }) => [styles.iconBtn, confirmDel === c.code && styles.delConfirm, pressed && styles.pressed]}
              >
                {confirmDel === c.code ? (
                  <Text style={styles.delText}>{tr("Sicuro?", "Sure?")}</Text>
                ) : (
                  <Feather name="trash-2" size={18} color={colors.error} />
                )}
              </Pressable>
              <Pressable
                testID={`contacts-call-${c.code}`}
                accessibilityLabel={tr(`Chiama ${c.name}`, `Call ${c.name}`)}
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
  flex: { flex: 1, minWidth: 0 },
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
  delConfirm: { width: 76, flexShrink: 0, backgroundColor: colors.error },
  delText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onError },
  hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.onSurface },
  code: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, letterSpacing: 2 },
  iconBtn: { width: 44, height: 44, flexShrink: 0, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  call: { width: 44, height: 44, flexShrink: 0, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandPrimary },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
