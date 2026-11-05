import Slider from "@react-native-community/slider";
import { StyleSheet, Text, View } from "react-native";

import { CameraProfiles } from "@/src/components/CameraProfiles";
import { Btn } from "@/src/components/ui";
import { tr } from "@/src/i18n";
import { colors, fonts, spacing } from "@/src/theme";

/** Fisheye calibration; values live only on this headset (stage localStorage), never sent with the video. */
export type Fisheye = { dx: number; dy: number; raggio: number; fov: number; occhio: number };
export const FE_BASE: Fisheye = { dx: 0, dy: 0, raggio: 100, fov: 187, occhio: 0 };

const SLIDERS = (): { key: keyof Fisheye; label: string; min: number; max: number; unit: string }[] => [
  { key: "dx", label: tr("Centro orizzontale", "Horizontal center"), min: -150, max: 150, unit: " px" },
  { key: "dy", label: tr("Centro verticale", "Vertical center"), min: -150, max: 150, unit: " px" },
  { key: "raggio", label: tr("Dimensione cerchio", "Circle size"), min: 70, max: 130, unit: "%" },
  { key: "fov", label: tr("Angolo obiettivo", "Lens angle"), min: 160, max: 220, unit: "°" },
  { key: "occhio", label: tr("Allineamento verticale occhio destro", "Right eye vertical alignment"), min: -40, max: 40, unit: " px" },
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
      <Text style={styles.note}>{tr("Regola i cerchi guardando l'anteprima. Le regolazioni restano salvate solo su questo visore.", "Adjust the circles while watching the preview. Settings are saved only on this headset.")}</Text>
      <Btn
        compact
        testID="viewer-fisheye-guide-button"
        label={guide ? tr("Torna alla vista 3D", "Back to 3D view") : tr("Guida calibrazione", "Calibration guide")}
        icon={guide ? "eye" : "target"}
        variant={guide ? "primary" : "secondary"}
        onPress={() => onGuide(!guide)}
      />
      {guide ? (
        <Text style={styles.note} testID="viewer-fisheye-guide-help">
          {tr("Nell'anteprima vedi il video piatto: sposta i cerchi pieni sul bordo delle due immagini tonde. Il tratteggio indica i 180° che vedrai nel visore.", "The preview shows the flat video: move the solid circles onto the edge of the two round images. The dashed line marks the 180° you'll see in the headset.")}
        </Text>
      ) : null}
      {SLIDERS().map((s) => (
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
      <Btn compact testID="viewer-fisheye-reset-button" label={tr("Ripristina valori iniziali", "Reset to defaults")} icon="rotate-ccw" onPress={onReset} />
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
