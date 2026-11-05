import { Feather } from "@react-native-vector-icons/feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn } from "@/src/components/ui";
import { termsAccepted, takePending } from "@/src/gate";
import { getLang, langChosen, setLang, type Lang } from "@/src/i18n";
import { colors, fonts, radius, spacing } from "@/src/theme";

const OPTIONS: { lang: Lang; label: string; flag: string }[] = [
  { lang: "it", label: "Italiano", flag: "🇮🇹" },
  { lang: "en", label: "English", flag: "🇬🇧" },
];

/** Language choice: shown on first launch (phone language pre-selected) and from the Home menu. */
export default function Language() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const first = !langChosen();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [sel, setSel] = useState<Lang>(getLang());
  const en = sel === "en"; // the screen previews the selected language

  const confirm = async () => {
    await setLang(sel);
    if (from === "home" && router.canGoBack()) return router.back();
    if (!termsAccepted()) return router.replace("/welcome");
    const next = takePending();
    router.replace({ pathname: next.pathname as "/", params: next.params });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]} testID="language-screen">
      <View style={styles.body}>
        <View style={styles.icon}>
          <Feather name="globe" size={44} color={colors.brandPrimary} />
        </View>
        <Text style={styles.title}>{en ? "Choose your language" : "Scegli la lingua"}</Text>
        <Text style={styles.text}>{en ? "You can change it later from the Home screen." : "Potrai cambiarla quando vuoi dalla Home."}</Text>
        <View style={styles.list}>
          {OPTIONS.map((o) => {
            const on = sel === o.lang;
            return (
              <Pressable
                key={o.lang}
                testID={`language-option-${o.lang}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, checked: on }}
                aria-checked={on}
                onPress={() => setSel(o.lang)}
                style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && styles.pressed]}
              >
                <Text style={styles.flag}>{o.flag}</Text>
                <Text style={styles.label}>{o.label}</Text>
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <Feather name="check" size={16} color={colors.onBrandPrimary} /> : null}</View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Btn testID="language-confirm-button" label={en ? (first ? "Continue" : "Save") : first ? "Continua" : "Salva"} icon="check" variant="primary" onPress={confirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  body: { flex: 1, justifyContent: "center", gap: spacing.md },
  icon: { width: 88, height: 88, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, color: colors.onSurface },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.muted },
  list: { gap: spacing.md, marginTop: spacing.md },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  optionOn: { borderColor: colors.brandPrimary, borderWidth: 2 },
  flag: { fontSize: 26 },
  label: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface },
  radio: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  pressed: { opacity: 0.85 },
});
