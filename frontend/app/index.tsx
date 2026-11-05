import { Feather } from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { IconName } from "@/src/components/ui";
import { greeting, TwoPeople } from "@/src/components/Warm";
import { useProState } from "@/src/pro";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const ONBOARDED_KEY = "onboarded"; // same key written by app/welcome.tsx

function RoleCard({ title, text, icon, onPress, testID, delay, tint }: { title: string; text: string; icon: IconName; onPress: () => void; testID: string; delay: number; tint: string }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(420)}>
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.card, { shadowColor: tint }, pressed && { borderColor: tint, transform: [{ scale: 0.98 }] }]}>
        <View style={[styles.cardIcon, { backgroundColor: tint }]}>
          <Feather name={icon} size={30} color={colors.onBrandPrimary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardText}>{text}</Text>
        </View>
        <Feather name="chevron-right" size={26} color={tint} />
      </Pressable>
    </Animated.View>
  );
}

function MenuRow({ icon, label, onPress, testID, tint = colors.brandPrimary, highlight }: { icon: IconName; label: string; onPress: () => void; testID: string; tint?: string; highlight?: boolean }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.historyBtn, highlight && { borderColor: tint }, pressed && styles.cardPressed]}>
      <View style={[styles.menuIcon, { backgroundColor: tint + "26" }]}>
        <Feather name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.historyText}>{label}</Text>
      <Feather name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pro } = useProState();
  useEffect(() => {
    storage.getItem(ONBOARDED_KEY, false).then((v) => {
      if (!v) router.replace("/welcome");
    });
  }, [router]);
  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.glow, colors.accentSoft, colors.surface]} locations={[0, 0.35, 0.7]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <Animated.View entering={FadeInDown.duration(420)}>
          <View style={styles.badge}>
            <Image source={require("../assets/images/icon.png")} style={styles.logo} testID="home-logo" />
            <Text style={styles.badgeText}>VIDEOCHIAMATA 3D</Text>
          </View>
          <View style={styles.heroRow}>
            <View style={styles.flex}>
              <Text style={styles.hello} testID="home-greeting">
                {greeting()}!
              </Text>
              <Text style={styles.title} testID="home-title">
                IriDuo
              </Text>
              <Text style={styles.slogan} testID="home-slogan">
                a tu per tu, in 3D
              </Text>
              <Text style={styles.sloganEn} testID="home-slogan-en">
                face to face, in 3D
              </Text>
            </View>
            <TwoPeople size={128} testID="home-art" />
          </View>
          <Text style={styles.lead}>Chi vuoi vedere oggi? Scegli se guardare con il visore o trasmettere con la tua camera VR180.</Text>
        </Animated.View>

        <View style={styles.cards}>
          <RoleCard
            testID="home-viewer-card"
            icon="eye"
            title="Guardo la chiamata"
            text="Mostra un codice, rispondi e guarda in 3D: con il dito o in un visore"
            onPress={() => router.push("/viewer")}
            delay={120}
            tint={colors.brandPrimary}
          />
          <RoleCard
            testID="home-sender-card"
            icon="video"
            title="Trasmetto in VR180"
            text="Collega la camera, inserisci il codice del visore e vai in onda"
            onPress={() => router.push("/sender")}
            delay={220}
            tint={colors.accent}
          />
        </View>

        <Animated.View entering={FadeInDown.delay(300).duration(420)} style={styles.menu}>
          <MenuRow testID="home-pro-button" icon="star" label={pro ? "IriDuo Pro · attivo" : "IriDuo Pro · 4K e storico completo"} onPress={() => router.push("/pro")} tint={colors.warning} highlight />
          <MenuRow testID="home-history-button" icon="clock" label="Storico chiamate" onPress={() => router.push("/history")} />
          <MenuRow testID="home-contacts-button" icon="users" label="Rubrica" onPress={() => router.push("/contacts")} tint={colors.accent} />
          <MenuRow testID="home-gallery-button" icon="image" label="Ricordi 3D" onPress={() => router.push("/gallery")} tint={colors.success} />
          <MenuRow testID="home-intro-button" icon="help-circle" label="Come funziona" onPress={() => router.push("/welcome")} tint={colors.muted} />
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
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, flexGrow: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  logo: { width: 48, height: 48, borderRadius: radius.md },
  badgeText: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1.6, color: colors.brandPrimary },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  hello: { fontFamily: fonts.display, fontSize: 20, color: colors.accent },
  slogan: { fontFamily: fonts.display, fontSize: 20, color: colors.brandPrimary, marginTop: spacing.xs },
  sloganEn: { fontFamily: fonts.regular, fontSize: 15, fontStyle: "italic", color: colors.muted, marginTop: 2 },
  title: { fontFamily: fonts.display, fontSize: 44, color: colors.onSurface, lineHeight: 52 },
  lead: { fontFamily: fonts.regular, fontSize: 17, color: colors.muted, lineHeight: 25, marginTop: spacing.md, maxWidth: 440 },
  cards: { gap: spacing.lg, marginTop: spacing.xl },
  card: {
    minHeight: 124,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardPressed: { transform: [{ scale: 0.98 }] },
  cardIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.display, fontSize: 21, color: colors.onSurface },
  cardText: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, marginTop: spacing.xs, lineHeight: 21 },
  note: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl, paddingHorizontal: spacing.xs },
  menu: { gap: spacing.sm, marginTop: spacing.xl },
  menuIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  historyBtn: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  historyText: { flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.onSurface },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.muted, lineHeight: 20 },
});
