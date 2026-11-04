import { Feather } from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, type IconName } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const ONBOARDED_KEY = "onboarded";

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

  const done = async () => {
    await storage.setItem(ONBOARDED_KEY, true);
    router.replace("/");
  };

  const s = STEPS[step];
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} testID="welcome-screen">
      <View style={styles.top}>
        <Text style={styles.brand}>CHIAMATA VR180</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.xl },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1.6, color: colors.brandPrimary },
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
