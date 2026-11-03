// Design tokens for this app. Dark only (from /app/design_guidelines.json).
// A plain key is a background, its `on` partner is the text/icon color on it.

import { useMemo } from "react";
import { Appearance, StyleSheet } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#0E1A2B",
  onSurface: "#EAF0F7",
  surfaceSecondary: "#17283F",
  onSurfaceSecondary: "#EAF0F7",
  surfaceTertiary: "#122033",
  onSurfaceTertiary: "#EAF0F7",
  surfaceInverse: "#EAF0F7",
  onSurfaceInverse: "#0E1A2B",
  muted: "#9DB0C8",

  brand: "#5CC8E0",
  onBrand: "#0E1A2B",
  brandPrimary: "#5CC8E0",
  onBrandPrimary: "#0E1A2B",
  brandSecondary: "#2A4060",
  onBrandSecondary: "#EAF0F7",
  brandTertiary: "#17283F",
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

  border: "#2A4060",
  borderStrong: "#5CC8E0",
  divider: "#2A4060",
  scrim: "rgba(14,26,43,0.72)",
  stage: "#000000",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light?: ThemeColors; dark: ThemeColors } = { dark };

export const colors = dark;

export const fonts = { regular: "Atkinson-Regular", bold: "Atkinson-Bold" };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 14, lg: 20, pill: 999 };

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
