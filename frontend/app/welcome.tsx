import type React from "react";
import { Feather } from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, type IconName } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const ONBOARDED_KEY = "onboarded";
export const TERMS_KEY = "terms_v1"; // age (14+ or parent permission) + rules of use accepted

const RULES = [
  "Devi avere almeno 14 anni. Se hai meno di 14 anni, puoi usare IriDuo solo con il permesso di un genitore.",
  "Puoi chiamare solo le persone che ti hanno dato il loro codice o link, e solo chi ha il tuo codice può chiamarti. Condividilo solo con chi conosci.",
  "Vietato mostrare o condividere contenuti inappropriati (per esempio nudità, pornografia, violenza o attività illegali).",
  "Vietati molestie, minacce, insulti, truffe e spam.",
  "IriDuo non registra mai senza il tuo consenso: chiede sempre il permesso e mostra un avviso rosso. Ricorda però che chiunque potrebbe registrare lo schermo con altri strumenti.",
  "Puoi bloccare e segnalare chi non rispetta le regole. Gli account segnalati da più utenti vengono sospesi automaticamente.",
  "Se subisci un reato (minacce, ricatti, diffusione di immagini private), rivolgiti alla Polizia Postale: www.commissariatodips.it",
  "Le videochiamate sono cifrate e non vengono registrate né visionate dal titolare dell'app.",
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "eye",
    title: "Chi guarda apre il Visore",
    text: "Sul telefono o sul Meta Quest compare un codice di 6 cifre. Mandalo con un tocco su WhatsApp o SMS.",
  },
  {
    icon: "video",
    title: "Chi trasmette inserisce il codice",
    text: "Collega la camera VR180 (o usa la fotocamera per una prova), scrivi il codice o tocca il link ricevuto e chiama.",
  },
  {
    icon: "aperture",
    title: "Rispondi e sei lì, in 3D",
    text: "Guardati intorno con il dito o muovendo il telefono, oppure mettilo in un visore Cardboard. Chat, reazioni, foto e registrazione incluse.",
  },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const [terms, setTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [rules, setRules] = useState(false);

  const done = () => setTerms(true); // the app can only be entered after accepting the rules
  const accept = async () => {
    await storage.setItem(ONBOARDED_KEY, true);
    await storage.setItem(TERMS_KEY, true);
    router.replace("/");
  };

  if (terms)
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} testID="welcome-terms">
        <ScrollView contentContainerStyle={styles.termsBody}>
          <Text style={styles.title}>Prima di iniziare</Text>
          <Text style={styles.text}>Leggi le regole d'uso di IriDuo:</Text>
          {RULES.map((r, i) => (
            <View key={i} style={styles.rule}>
              <Feather name="check" size={18} color={colors.accent} />
              <Text style={styles.ruleText}>{r}</Text>
            </View>
          ))}
          <Check testID="welcome-adult-check" on={adult} onPress={() => setAdult(!adult)} label="Dichiaro di avere almeno 14 anni, oppure il permesso di un genitore" />
          <Check testID="welcome-rules-check" on={rules} onPress={() => setRules(!rules)}>
            Ho letto e accetto i{" "}
            <Text style={styles.link} testID="welcome-terms-link" onPress={() => router.push({ pathname: "/legal", params: { doc: "terms" } })}>
              Termini d'uso
            </Text>{" "}
            e l'
            <Text style={styles.link} testID="welcome-privacy-link" onPress={() => router.push({ pathname: "/legal", params: { doc: "privacy" } })}>
              Informativa privacy
            </Text>
          </Check>
        </ScrollView>
        <Btn testID="welcome-accept-button" label="Accetto ed entro" icon="check" variant="primary" disabled={!adult || !rules} onPress={accept} />
      </View>
    );

  const s = STEPS[step];
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} testID="welcome-screen">
      <View style={styles.top}>
        <View>
          <Text style={styles.brand}>IRIDUO</Text>
          <Text style={styles.slogan} testID="welcome-slogan">
            a tu per tu, in 3D · face to face, in 3D
          </Text>
        </View>
        <Pressable testID="welcome-skip-button" onPress={done} hitSlop={10} style={styles.skip}>
          <Text style={styles.skipText}>Salta</Text>
        </Pressable>
      </View>

      <Animated.View key={step} entering={FadeInRight.duration(350)} style={styles.body}>
        <View style={styles.stepNum}>
          <Text style={styles.stepNumText}>{step + 1}</Text>
        </View>
        <View style={styles.icon}>
          <Feather name={s.icon} size={56} color={colors.brandPrimary} />
        </View>
        <Text style={styles.title} testID="welcome-step-title">
          {s.title}
        </Text>
        <Text style={styles.text}>{s.text}</Text>
      </Animated.View>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
        ))}
      </View>
      <Btn
        testID="welcome-next-button"
        label={last ? "Inizia" : "Avanti"}
        icon={last ? "check" : "arrow-right"}
        variant="primary"
        onPress={() => (last ? done() : setStep(step + 1))}
      />
    </View>
  );
}

function Check({ on, onPress, label, testID, children }: { on: boolean; onPress: () => void; label?: string; testID: string; children?: React.ReactNode }) {
  return (
    <Pressable testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked: on }} aria-checked={on} onPress={onPress} style={styles.check}>
      <View style={[styles.box, on && styles.boxOn]}>{on ? <Feather name="check" size={18} color={colors.onBrandPrimary} /> : null}</View>
      <Text style={styles.checkText}>{children ?? label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  termsBody: { gap: spacing.md, paddingBottom: spacing.xl },
  rule: { flexDirection: "row", gap: spacing.sm },
  ruleText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.onSurface },
  check: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 52, marginTop: spacing.sm },
  box: { width: 28, height: 28, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.accent },
  checkText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.onSurface },
  link: { color: colors.brandPrimary, textDecorationLine: "underline" },
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.xl },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1.6, color: colors.brandPrimary },
  slogan: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  skip: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  skipText: { fontFamily: fonts.bold, fontSize: 16, color: colors.muted },
  body: { flex: 1, justifyContent: "center", gap: spacing.lg },
  stepNum: { width: 36, height: 36, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontFamily: fonts.bold, fontSize: 16, color: colors.brandPrimary },
  icon: { width: 112, height: 112, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, color: colors.onSurface },
  text: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 27, color: colors.muted },
  dots: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandSecondary },
  dotOn: { width: 24, backgroundColor: colors.brandPrimary },
});
