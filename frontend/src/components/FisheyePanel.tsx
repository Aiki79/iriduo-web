import Slider from "@react-native-community/slider";
import { StyleSheet, Text, View } from "react-native";

import { CameraProfiles } from "@/src/components/CameraProfiles";
import { Btn } from "@/src/components/ui";
import { colors, fonts, spacing } from "@/src/theme";

/** Fisheye calibration; values live only on this headset (stage localStorage), never sent with the video. */
export type Fisheye = { dx: number; dy: number; raggio: number; fov: number; occhio: number };
export const FE_BASE: Fisheye = { dx: 0, dy: 0, raggio: 100, fov: 187, occhio: 0 };

const SLIDERS: { key: keyof Fisheye; label: string; min: number; max: number; unit: string }[] = [
  { key: "dx", label: "Centro orizzontale", min: -150, max: 150, unit: " px" },
  { key: "dy", label: "Centro verticale", min: -150, max: 150, unit: " px" },
  { key: "raggio", label: "Dimensione cerchio", min: 70, max: 130, unit: "%" },
  { key: "fov", label: "Angolo obiettivo", min: 160, max: 220, unit: "°" },
  { key: "occhio", label: "Allineamento verticale occhio destro", min: -40, max: 40, unit: " px" },
];

export function FisheyePanel({
  value,
  onChange,
  onReset,
  guide,
  onGuide,
}: {
  value: Fisheye;
  onChange: (v: Fisheye) => void;
  onReset: () => void;
  guide: boolean;
  onGuide: (on: boolean) => void;
}) {
  return (
    <View style={styles.panel} testID="viewer-fisheye-panel">
      <Text style={styles.note}>Regola i cerchi guardando l'anteprima. Le regolazioni restano salvate solo su questo visore.</Text>
      <Btn
        compact
        testID="viewer-fisheye-guide-button"
        label={guide ? "Torna alla vista 3D" : "Guida calibrazione"}
        icon={guide ? "eye" : "target"}
        variant={guide ? "primary" : "secondary"}
        onPress={() => onGuide(!guide)}
      />
      {guide ? (
        <Text style={styles.note} testID="viewer-fisheye-guide-help">
          Nell'anteprima vedi il video piatto: sposta i cerchi pieni sul bordo delle due immagini tonde. Il tratteggio indica i 180° che vedrai nel visore.
        </Text>
      ) : null}
      {SLIDERS.map((s) => (
        <View key={s.key}>
          <View style={styles.row}>
            <Text style={styles.label}>{s.label}</Text>
            <Text style={styles.value} testID={`viewer-fisheye-${s.key}-value`}>
              {value[s.key]}
              {s.unit}
            </Text>
          </View>
          <Slider
            testID={`viewer-fisheye-${s.key}-slider`}
            accessibilityLabel={s.label}
            // the web slider mis-places the thumb on negative ranges, so it always works on 0..span
            minimumValue={0}
            maximumValue={s.max - s.min}
            step={1}
            value={value[s.key] - s.min}
            onValueChange={(v: number) => onChange({ ...value, [s.key]: Math.round(v) + s.min })}
            minimumTrackTintColor={colors.brandPrimary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.brandPrimary}
            style={styles.slider}
          />
        </View>
      ))}
      <Btn compact testID="viewer-fisheye-reset-button" label="Ripristina valori iniziali" icon="rotate-ccw" onPress={onReset} />
      <CameraProfiles value={value} onApply={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.xs, marginTop: spacing.sm },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  label: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.onSurface },
  value: { fontFamily: fonts.bold, fontSize: 14, color: colors.brandPrimary },
  slider: { height: 44 },
});
