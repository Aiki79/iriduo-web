// Design tokens for this app. Dark only (from /app/design_guidelines.json).
// A plain key is a background, its `on` partner is the text/icon color on it.

import { useMemo } from "react";
import { Appearance, StyleSheet } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#151833",
  onSurface: "#EAF0F7",
  surfaceSecondary: "#211F45",
  onSurfaceSecondary: "#EAF0F7",
  surfaceTertiary: "#1B1A3C",
  onSurfaceTertiary: "#EAF0F7",
  surfaceInverse: "#EAF0F7",
  onSurfaceInverse: "#151833",
  muted: "#B3B0D6",

  brand: "#5CC8E0",
  onBrand: "#0E1A2B",
  brandPrimary: "#5CC8E0",
  onBrandPrimary: "#0E1A2B",
  brandSecondary: "#3A3566",
  onBrandSecondary: "#EAF0F7",
  brandTertiary: "#211F45",
  onBrandTertiary: "#EAF0F7",

  success: "#5CE093",
  onSuccess: "#0E1A2B",
  warning: "#E0A85C",
  onWarning: "#3A2A10",
  warningSurface: "#3A2A10",
  error: "#E0605C",
  onError: "#FFFFFF",
  info: "#5CC8E0",
  onInfo: "#0E1A2B",

  // warm coral from the icon: "trasmetto", hearts, highlights
  accent: "#FF7A8A",
  onAccent: "#2A0F18",
  accentSoft: "rgba(255,122,138,0.14)",
  glow: "rgba(92,200,224,0.16)",

  border: "#38346A",
  borderStrong: "#5CC8E0",
  divider: "#38346A",
  scrim: "rgba(21,24,51,0.72)",
  stage: "#000000",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light?: ThemeColors; dark: ThemeColors } = { dark };

export const colors = dark;

export const fonts = { regular: "Atkinson-Regular", bold: "Atkinson-Bold", display: "VarelaRound" };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 8, md: 18, lg: 26, pill: 999 };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  return { scheme: "dark", colors: dark };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors: c } = useTheme();
    return useMemo(() => StyleSheet.create(factory(c)), [c]);
  };
}
