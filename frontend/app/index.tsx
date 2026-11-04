import { Feather } from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { IconName } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const ONBOARDED_KEY = "onboarded"; // same key written by app/welcome.tsx

const HERO =
  "https://images.unsplash.com/photo-1535540878298-a155c6d065ef?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1200";

function RoleCard({ title, text, icon, onPress, testID, delay }: { title: string; text: string; icon: IconName; onPress: () => void; testID: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(420)}>
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.cardIcon}>
          <Feather name={icon} size={30} color={colors.onBrandPrimary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardText}>{text}</Text>
        </View>
        <Feather name="chevron-right" size={26} color={colors.brandPrimary} />
      </Pressable>
    </Animated.View>
  );
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    storage.getItem(ONBOARDED_KEY, false).then((v) => {
      if (!v) router.replace("/welcome");
    });
  }, [router]);
  return (
    <View style={styles.root}>
      <Image source={{ uri: HERO }} style={styles.hero} contentFit="cover" transition={300} />
      <LinearGradient colors={[colors.scrim, colors.surface]} locations={[0, 0.62]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing["3xl"], paddingBottom: insets.bottom + spacing.xl }]}>
        <Animated.View entering={FadeInDown.duration(420)}>
          <View style={styles.badge}>
            <Image source={require("../assets/images/icon.png")} style={styles.logo} testID="home-logo" />
            <Text style={styles.badgeText}>VIDEOCHIAMATA 3D</Text>
          </View>
          <Text style={styles.title} testID="home-title">
            BiLume
          </Text>
          <Text style={styles.slogan} testID="home-slogan">
            a tu per tu, in 3D
          </Text>
          <Text style={styles.sloganEn} testID="home-slogan-en">
            face to face, in 3D
          </Text>
          <Text style={styles.lead}>
            Chi trasmette usa una camera VR180 a doppio obiettivo, chi guarda usa il visore o il telefono.
          </Text>
        </Animated.View>

        <View style={styles.cards}>
          <RoleCard
            testID="home-viewer-card"
            icon="eye"
            title="Guardo la chiamata"
            text="Mostra un codice, rispondi e guarda in 3D: con il dito o in un visore per telefono"
            onPress={() => router.push("/viewer")}
            delay={120}
          />
          <RoleCard
            testID="home-sender-card"
            icon="video"
            title="Trasmetto in VR180"
            text="Collega la camera, inserisci il codice del visore e vai in onda"
            onPress={() => router.push("/sender")}
            delay={220}
          />
        </View>

        <Animated.View entering={FadeInDown.delay(300).duration(420)}>
          <Pressable testID="home-history-button" onPress={() => router.push("/history")} style={({ pressed }) => [styles.historyBtn, pressed && styles.cardPressed]}>
            <Feather name="clock" size={22} color={colors.brandPrimary} />
            <Text style={styles.historyText}>Storico chiamate</Text>
            <Feather name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
          <Pressable testID="home-contacts-button" onPress={() => router.push("/contacts")} style={({ pressed }) => [styles.historyBtn, styles.mtSm, pressed && styles.cardPressed]}>
            <Feather name="users" size={22} color={colors.brandPrimary} />
            <Text style={styles.historyText}>Rubrica</Text>
            <Feather name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
          <Pressable testID="home-gallery-button" onPress={() => router.push("/gallery")} style={({ pressed }) => [styles.historyBtn, styles.mtSm, pressed && styles.cardPressed]}>
            <Feather name="image" size={22} color={colors.brandPrimary} />
            <Text style={styles.historyText}>Ricordi 3D</Text>
            <Feather name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
          <Pressable testID="home-intro-button" onPress={() => router.push("/welcome")} style={({ pressed }) => [styles.historyBtn, styles.mtSm, pressed && styles.cardPressed]}>
            <Feather name="help-circle" size={22} color={colors.brandPrimary} />
            <Text style={styles.historyText}>Come funziona</Text>
            <Feather name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(420)} style={styles.note} testID="home-compat-note">
          <Feather name="info" size={18} color={colors.muted} />
          <Text style={styles.noteText}>
            Compatibile con la pagina Chiamata VR180 sul Meta Quest: stessi codici a 6 cifre.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { position: "absolute", top: 0, left: 0, right: 0, height: 420 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, flexGrow: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  logo: { width: 56, height: 56, borderRadius: radius.md },
  badgeText: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1.6, color: colors.brandPrimary },
  slogan: { fontFamily: fonts.bold, fontSize: 22, color: colors.brandPrimary, marginTop: spacing.xs },
  sloganEn: { fontFamily: fonts.regular, fontSize: 15, fontStyle: "italic", color: colors.muted, marginTop: 2 },
  title: { fontFamily: fonts.bold, fontSize: 40, color: colors.onSurface, lineHeight: 46 },
  lead: { fontFamily: fonts.regular, fontSize: 18, color: colors.muted, lineHeight: 26, marginTop: spacing.md, maxWidth: 440 },
  cards: { gap: spacing.lg, marginTop: spacing["2xl"] },
  card: {
    minHeight: 132,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cardPressed: { borderColor: colors.brandPrimary, transform: [{ scale: 0.98 }] },
  cardIcon: { width: 60, height: 60, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.bold, fontSize: 21, color: colors.onSurface },
  cardText: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, marginTop: spacing.xs, lineHeight: 21 },
  note: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl, paddingHorizontal: spacing.xs },
  historyBtn: {
    marginTop: spacing.lg,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  historyText: { flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.onSurface },
  mtSm: { marginTop: spacing.sm },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.muted, lineHeight: 20 },
});
