import type React from "react";
import { Feather } from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, type IconName } from "@/src/components/ui";
import { acceptTerms, takePending } from "@/src/gate";
import { tr, useLang } from "@/src/i18n";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const ONBOARDED_KEY = "onboarded";

const RULES = () => [
  tr("Devi avere almeno 14 anni. Se hai meno di 14 anni, puoi usare IriDuo solo con il permesso di un genitore.", "You must be at least 14 years old. If you are under 14, you can use IriDuo only with a parent's permission."),
  tr("Puoi chiamare solo le persone che ti hanno dato il loro codice o link, e solo chi ha il tuo codice può chiamarti. Condividilo solo con chi conosci.", "You can only call people who gave you their code or link, and only people with your code can call you. Share it only with people you know."),
  tr("Vietato mostrare o condividere contenuti inappropriati (per esempio nudità, pornografia, violenza o attività illegali).", "Showing or sharing inappropriate content (for example nudity, pornography, violence or illegal activities) is forbidden."),
  tr("Vietati molestie, minacce, insulti, truffe e spam.", "Harassment, threats, insults, scams and spam are forbidden."),
  tr("IriDuo non registra mai senza il tuo consenso: chiede sempre il permesso e mostra un avviso rosso. Ricorda però che chiunque potrebbe registrare lo schermo con altri strumenti.", "IriDuo never records without your consent: it always asks for permission and shows a red warning. Remember, though, that anyone could record the screen with other tools."),
  tr("Puoi bloccare e segnalare chi non rispetta le regole. Gli account segnalati da più utenti vengono sospesi automaticamente.", "You can block and report anyone who breaks the rules. Accounts reported by several users are suspended automatically."),
  tr("Se subisci un reato (minacce, ricatti, diffusione di immagini private), rivolgiti alla Polizia Postale: www.commissariatodips.it", "If you are the victim of a crime (threats, blackmail, sharing of private images), contact the police. In Italy: www.commissariatodips.it"),
  tr("Le videochiamate sono cifrate e non vengono registrate né visionate dal titolare dell'app.", "Video calls are encrypted and are never recorded or viewed by the app owner."),
];

const STEPS = (): { icon: IconName; title: string; text: string }[] => [
  {
    icon: "eye",
    title: tr("Chi guarda apre il Visore", "The viewer opens the Headset"),
    text: tr("Sul telefono o sul Meta Quest compare un codice di 6 cifre. Mandalo con un tocco su WhatsApp o SMS.", "A 6-digit code appears on the phone or Meta Quest. Send it with one tap via WhatsApp or SMS."),
  },
  {
    icon: "video",
    title: tr("Chi trasmette inserisce il codice", "The caller enters the code"),
    text: tr("Collega la camera VR180 (o usa la fotocamera per una prova), scrivi il codice o tocca il link ricevuto e chiama.", "Connect the VR180 camera (or use the phone camera for a test), type the code or tap the link you received, and call."),
  },
  {
    icon: "aperture",
    title: tr("Rispondi e sei lì, in 3D", "Answer and you're there, in 3D"),
    text: tr("Guardati intorno con il dito o muovendo il telefono, oppure mettilo in un visore Cardboard. Chat, reazioni, foto e registrazione incluse.", "Look around with your finger or by moving the phone, or put it in a Cardboard headset. Chat, reactions, photos and recording included."),
  },
];

export default function Welcome() {
  useLang();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const steps = STEPS();
  const last = step === steps.length - 1;
  const [terms, setTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [rules, setRules] = useState(false);

  const done = () => setTerms(true); // the app can only be entered after accepting the rules
  const accept = async () => {
    await storage.setItem(ONBOARDED_KEY, true);
    await acceptTerms();
    const next = takePending();
    router.replace({ pathname: next.pathname as "/", params: next.params });
  };

  if (terms)
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} testID="welcome-terms">
        <ScrollView contentContainerStyle={styles.termsBody}>
          <Text style={styles.title}>{tr("Prima di iniziare", "Before you start")}</Text>
          <Text style={styles.text}>{tr("Leggi le regole d'uso di IriDuo:", "Read the IriDuo rules of use:")}</Text>
          {RULES().map((r, i) => (
            <View key={i} style={styles.rule}>
              <Feather name="check" size={18} color={colors.accent} />
              <Text style={styles.ruleText}>{r}</Text>
            </View>
          ))}
          <Check testID="welcome-adult-check" on={adult} onPress={() => setAdult(!adult)} label={tr("Dichiaro di avere almeno 14 anni, oppure il permesso di un genitore", "I declare that I am at least 14, or have a parent's permission")} />
          <Check testID="welcome-rules-check" on={rules} onPress={() => setRules(!rules)}>
            {tr("Ho letto e accetto i", "I have read and accept the")}{" "}
            <Text style={styles.link} testID="welcome-terms-link" onPress={() => router.push({ pathname: "/legal", params: { doc: "terms" } })}>
              {tr("Termini d'uso", "Terms of use")}
            </Text>{" "}
            {tr("e l'", "and the ")}
            <Text style={styles.link} testID="welcome-privacy-link" onPress={() => router.push({ pathname: "/legal", params: { doc: "privacy" } })}>
              {tr("Informativa privacy", "Privacy policy")}
            </Text>
          </Check>
        </ScrollView>
        <Btn testID="welcome-accept-button" label={tr("Accetto ed entro", "Accept and enter")} icon="check" variant="primary" disabled={!adult || !rules} onPress={accept} />
      </View>
    );

  const s = steps[step];
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} testID="welcome-screen">
      <View style={styles.top}>
        <View>
          <Text style={styles.brand}>IRIDUO</Text>
          <Text style={styles.slogan} testID="welcome-slogan">
            {tr("a tu per tu, in 3D", "face to face, in 3D")}
          </Text>
        </View>
        <Pressable testID="welcome-skip-button" onPress={done} hitSlop={10} style={styles.skip}>
          <Text style={styles.skipText}>{tr("Salta", "Skip")}</Text>
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
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
        ))}
      </View>
      <Btn
        testID="welcome-next-button"
        label={last ? tr("Inizia", "Start") : tr("Avanti", "Next")}
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
