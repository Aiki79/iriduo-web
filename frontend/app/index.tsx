import { Feather } from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientTitle } from "@/src/components/GradientTitle";
import type { IconName } from "@/src/components/ui";
import { greeting, TwoPeople } from "@/src/components/Warm";
import { termsAccepted } from "@/src/gate";
import { langChosen, tr, useLang } from "@/src/i18n";
import { useProState } from "@/src/pro";
import { colors, fonts, radius, spacing } from "@/src/theme";


function RoleCard({ title, text, icon, onPress, testID, delay, tint, compact }: { title: string; text: string; icon: IconName; onPress: () => void; testID: string; delay: number; tint: string; compact: boolean }) {
  const iconEl = (
    <View style={[styles.cardIcon, compact && styles.cardIconSmall, { backgroundColor: tint }]}>
      <Feather name={icon} size={compact ? 24 : 30} color={colors.onBrandPrimary} />
    </View>
  );
  const chevron = <Feather name="chevron-right" size={26} color={tint} />;
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(420)}>
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.card, compact && styles.cardCompact, { shadowColor: tint }, pressed && { borderColor: tint, transform: [{ scale: 0.98 }] }]}>
        {/* Narrow screens or large text: icon and arrow go on top, so the words get the full width. */}
        {compact ? (
          <View style={styles.cardTop}>
            {iconEl}
            {chevron}
          </View>
        ) : (
          iconEl
        )}
        <View style={compact ? undefined : styles.flex}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardText}>{text}</Text>
        </View>
        {!compact && chevron}
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
  const lang = useLang();
  const { pro } = useProState();
  const { width, fontScale } = useWindowDimensions();
  const compact = width / fontScale < 400;
  useEffect(() => {
    if (!langChosen() || !termsAccepted()) router.replace(langChosen() ? "/welcome" : "/language");
  }, [router]);
  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.glow, colors.accentSoft, colors.surface]} locations={[0, 0.35, 0.7]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <Animated.View entering={FadeInDown.duration(420)}>
          <View style={styles.badge}>
            <Image source={require("../assets/images/icon.png")} style={styles.logo} testID="home-logo" />
            <Text style={styles.badgeText}>{tr("VIDEOCHIAMATA 3D", "3D VIDEO CALLS")}</Text>
          </View>
          <View style={styles.heroRow}>
            <View style={styles.flex}>
              <Text style={styles.hello} testID="home-greeting">
                {greeting()}!
              </Text>
              <GradientTitle style={styles.title} testID="home-title" />
              <Text style={styles.slogan} testID="home-slogan">
                {tr("a tu per tu, in 3D", "face to face, in 3D")}
              </Text>
            </View>
            {width / fontScale >= 300 && <TwoPeople size={compact ? 76 : 128} testID="home-art" />}
          </View>
          <Text style={styles.lead}>{tr("Chi vuoi vedere oggi?", "Who do you want to see today?")}</Text>
        </Animated.View>

        <View style={styles.cards}>
          <RoleCard
            testID="home-viewer-card"
            icon="eye"
            title={tr("Rispondi con il visore", "Answer with the headset")}
            text={tr("Mostra il tuo codice e vedi chi ti chiama in 3D", "Show your code and see who's calling you in 3D")}
            compact={compact}
            onPress={() => router.push("/viewer")}
            delay={120}
            tint={colors.brandPrimary}
          />
          <RoleCard
            testID="home-sender-card"
            icon="video"
            title={tr("Chiama con la camera 3D", "Call with the 3D camera")}
            text={tr("Inserisci il codice e appari in 3D nel suo visore", "Enter the code and appear in 3D in their headset")}
            compact={compact}
            onPress={() => router.push("/sender")}
            delay={220}
            tint={colors.accent}
          />
        </View>

        <Animated.View entering={FadeInDown.delay(300).duration(420)} style={styles.menu}>
          <MenuRow testID="home-pro-button" icon="star" label={pro ? tr("IriDuo Pro · attivo", "IriDuo Pro · active") : tr("IriDuo Pro · 4K e storico completo", "IriDuo Pro · 4K and full history")} onPress={() => router.push("/pro")} tint={colors.warning} highlight />
          <MenuRow testID="home-history-button" icon="clock" label={tr("Storico chiamate", "Call history")} onPress={() => router.push("/history")} />
          <MenuRow testID="home-contacts-button" icon="users" label={tr("Rubrica", "Address book")} onPress={() => router.push("/contacts")} tint={colors.accent} />
          <MenuRow testID="home-gallery-button" icon="image" label={tr("Ricordi 3D", "3D memories")} onPress={() => router.push("/gallery")} tint={colors.success} />
          <MenuRow testID="home-intro-button" icon="help-circle" label={tr("Come funziona", "How it works")} onPress={() => router.push("/welcome")} tint={colors.muted} />
          <MenuRow testID="home-language-button" icon="globe" label={lang === "en" ? "Language · English" : "Lingua · Italiano"} onPress={() => router.push({ pathname: "/language", params: { from: "home" } })} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(420)} style={styles.note} testID="home-compat-note">
          <Feather name="info" size={18} color={colors.muted} />
          <Text style={styles.noteText}>
            {tr("Compatibile con la pagina Chiamata VR180 sul Meta Quest: stessi codici a 6 cifre.", "Works with the VR180 Call page on Meta Quest: same 6-digit codes.")}
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
  contentCompact: { paddingHorizontal: spacing.lg },
  badge: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  logo: { width: 48, height: 48, borderRadius: radius.md },
  badgeText: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1.6, color: colors.brandPrimary },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  hello: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  slogan: { fontFamily: fonts.display, fontSize: 20, color: colors.brandPrimary, marginTop: spacing.xs },
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
  cardCompact: { flexDirection: "column", alignItems: "stretch", gap: spacing.md, padding: spacing.lg, minHeight: 0 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardPressed: { transform: [{ scale: 0.98 }] },
  cardIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  cardIconSmall: { width: 48, height: 48, borderRadius: 24 },
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
