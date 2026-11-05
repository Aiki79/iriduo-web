import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ComponentType, type ReactElement, type ReactNode } from "react";
import { Platform, StyleSheet, Text, View, type TextStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";

import { colors } from "@/src/theme";

// The library's class typings clash with React 19 types; runtime is fine.
const Mask = MaskedView as unknown as ComponentType<{ maskElement: ReactElement; children: ReactNode }>;

// Logo colours of the 3D glasses: they must stay identical in every theme.
const GRADIENT = ["#3FD0F0", "#8B7BFF", "#FF5A78"] as const;
const RED_SHADOW = "rgba(255,90,120,0.35)";
const CYAN_SHADOW = "rgba(63,208,240,0.30)";
const GLOW = "rgba(139,123,255,0.45)";
// Twice as wide as the word and mirrored, so sliding it half-way and back starts and ends on the same colours.
const LOOP = [...GRADIENT, "#8B7BFF", "#3FD0F0"] as const;
const SHEEN = ["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"] as const;
const EASE = Easing.inOut(Easing.quad);
const SHEEN_W = 0.45;

// Web: same shimmer with CSS. Background props stay inline (StyleSheet validation rejects them);
// react-native-web only compiles animationKeyframes inside StyleSheet.create.
const WEB_BG = {
  color: "transparent",
  backgroundImage: `linear-gradient(100deg, ${SHEEN.join(", ")}), linear-gradient(90deg, ${LOOP.join(", ")})`,
  backgroundSize: `${SHEEN_W * 100}% 100%, 200% 100%`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "-80% 0, 0% 0",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
} as unknown as TextStyle;
const WEB_ANIM = StyleSheet.create({ shimmer: {
  animationKeyframes: [{ "0%": { backgroundPosition: "-80% 0, 0% 0" }, "50%": { backgroundPosition: "180% 0, 100% 0" }, "100%": { backgroundPosition: "180% 0, 0% 0" } }],
  animationDuration: "4400ms",
  animationDelay: "400ms",
  animationTimingFunction: "ease-in-out",
  animationIterationCount: 1,
  animationFillMode: "both",
} as unknown as TextStyle }).shimmer;

/** Native: the gradient strip slides once and back while a light sheen crosses the word, like a reflection. */
function ShimmerFill({ style }: { style: TextStyle }) {
  const [w, setW] = useState(0);
  const reduced = useReducedMotion();
  const slide = useSharedValue(0);
  const sheen = useSharedValue(0);
  useEffect(() => {
    if (!w || reduced) return;
    slide.value = withDelay(400, withSequence(withTiming(1, { duration: 2200, easing: EASE }), withTiming(0, { duration: 2200, easing: EASE })));
    sheen.value = withDelay(700, withTiming(1, { duration: 1800, easing: EASE }));
  }, [w, reduced, slide, sheen]);
  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -slide.value * w }] }));
  const sheenStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -SHEEN_W * w + sheen.value * (1 + SHEEN_W) * w }] }));
  return (
    <View style={styles.clip} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      {w > 0 && (
        <>
          <Animated.View style={[styles.abs, styles.fullH, { width: 2 * w }, stripStyle]}>
            <LinearGradient colors={LOOP} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.flex} />
          </Animated.View>
          <Animated.View style={[styles.abs, styles.fullH, { width: SHEEN_W * w }, sheenStyle]}>
            <LinearGradient colors={SHEEN} start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.7 }} style={styles.flex} />
          </Animated.View>
        </>
      )}
      <Text style={[style, styles.hidden]}>Duo</Text>
    </View>
  );
}

/** "Iri" in white + "Duo" with the shimmering 3D gradient, a soft glow and a double (left/right eye) shadow. */
export function GradientTitle({ style, testID }: { style: TextStyle; testID?: string }) {
  const s = (style.fontSize ?? 44) / 64; // offsets tuned on a 64pt title
  const layer = (color: string, dx: number, dy: number, glow?: boolean) => (
    <Text
      style={[
        style,
        styles.abs,
        { color, transform: [{ translateX: dx * s }, { translateY: dy * s }] },
        glow && { textShadowColor: GLOW, textShadowRadius: 12 * s, textShadowOffset: { width: 0, height: 0 } },
      ]}
    >
      Duo
    </Text>
  );
  const gradient =
    Platform.OS === "web" ? (
      <Text style={[style, WEB_BG, WEB_ANIM]}>Duo</Text>
    ) : (
      <Mask maskElement={<Text style={style}>Duo</Text>}>
        <ShimmerFill style={style} />
      </Mask>
    );
  return (
    <View style={styles.row} testID={testID} accessible accessibilityRole="header" accessibilityLabel="IriDuo">
      <Text style={[style, { color: colors.onSurface }]}>Iri</Text>
      <View>
        {layer(GLOW, 0, 0, true)}
        {layer(RED_SHADOW, 4, 3)}
        {layer(CYAN_SHADOW, -2, 0)}
        {gradient}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", alignSelf: "flex-start" },
  abs: { position: "absolute", left: 0, top: 0 },
  hidden: { opacity: 0 },
  clip: { overflow: "hidden" },
  fullH: { bottom: 0 },
  flex: { flex: 1 },
});
