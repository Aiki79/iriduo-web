import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, Text, View, type TextStyle } from "react-native";
import type { ComponentType, ReactElement, ReactNode } from "react";

import { colors } from "@/src/theme";

// The library's class typings clash with React 19 types; runtime is fine.
const Mask = MaskedView as unknown as ComponentType<{ maskElement: ReactElement; children: ReactNode }>;

// Logo colours of the 3D glasses: they must stay identical in every theme.
const GRADIENT = ["#3FD0F0", "#8B7BFF", "#FF5A78"] as const;
const RED_SHADOW = "rgba(255,90,120,0.35)";
const CYAN_SHADOW = "rgba(63,208,240,0.30)";
const GLOW = "rgba(139,123,255,0.45)";

/** "Iri" in white + "Duo" with the 3D gradient, a soft glow and a double (left/right eye) shadow. */
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
      // backgroundClip text is the web equivalent of the native mask
      <Text style={[style, { color: "transparent", backgroundImage: `linear-gradient(90deg, ${GRADIENT.join(", ")})`, backgroundClip: "text", WebkitBackgroundClip: "text" } as TextStyle]}>Duo</Text>
    ) : (
      <Mask maskElement={<Text style={style}>Duo</Text>}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={[style, styles.hidden]}>Duo</Text>
        </LinearGradient>
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
});
