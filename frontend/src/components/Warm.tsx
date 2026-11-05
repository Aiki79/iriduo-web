import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { colors, fonts } from "@/src/theme";

const ART = require("../../assets/images/splash-image.png"); // the two people from the app icon

/** The two people of the icon, gently floating up and down. */
export function TwoPeople({ size = 160, testID }: { size?: number; testID?: string }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(-6, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1);
  }, [y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={style} testID={testID}>
      <Image source={ART} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="Due persone che si parlano in 3D" />
    </Animated.View>
  );
}

const AVATAR_COLORS = [colors.brandPrimary, colors.accent, "#B794F6", "#F6C177", "#7DDBA3", "#F78FB3"];

/** Round avatar with initials; the colour is stable for the same name. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const words = name.trim().split(/\s+/);
  const first = (w?: string) => (w ? (Array.from(w)[0] ?? "") : ""); // whole character, so emoji stay intact
  const initials = (first(words[0]) + first(words[1])).toUpperCase() || "?";
  let h = 0;
  for (const ch of name) h = (h * 37 + ch.charCodeAt(0)) >>> 0; // 37 spreads well over the 6 colours
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: AVATAR_COLORS[h % AVATAR_COLORS.length] }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? "Buonanotte" : h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
}

/** Big heart that pops and fades: shown once, at the first successful call. */
export function HeartBurst({ testID }: { testID?: string }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(9)} exiting={FadeOut.duration(500)} style={styles.burst} pointerEvents="none" testID={testID}>
      <MaterialDesignIcons name="heart" size={120} color={colors.accent} />
      <Text style={styles.burstText}>Prima chiamata in 3D!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, color: colors.onBrandPrimary },
  burst: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", zIndex: 50 },
  burstText: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface, marginTop: 8, textShadowColor: colors.scrim, textShadowRadius: 8 },
});
