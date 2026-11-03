import { Feather } from "@react-native-vector-icons/feather";
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";

import type { IconName } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";

const WHATSAPP_GREEN = "#25D366"; // brand color, identical in every theme
const WHATSAPP_ON = "#0B2E17";

const message = (code: string) =>
  `Ti aspetto su Chiamata VR180! Il codice del mio visore è ${code}. Apri l'app, scegli "Trasmetto in VR180" e inseriscilo per chiamarmi in 3D.`;

function ShareBtn({ label, icon, onPress, testID, bg, fg, border }: { label: string; icon: IconName; onPress: () => void; testID: string; bg: string; fg: string; border: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Condividi il codice: ${label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, borderColor: border }, pressed && styles.pressed]}
    >
      <Feather name={icon} size={18} color={fg} />
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ShareCode({ code }: { code: string | null }) {
  if (!code) return null;
  const text = encodeURIComponent(message(code));

  const whatsapp = () => Linking.openURL(`https://wa.me/?text=${text}`).catch(() => {});
  const sms = () => Linking.openURL(Platform.OS === "ios" ? `sms:&body=${text}` : `sms:?body=${text}`).catch(() => {});
  const other = async () => {
    try {
      await Share.share({ message: message(code) });
    } catch {
      /* share sheet dismissed or unavailable */
    }
  };

  return (
    <View style={styles.row} testID="viewer-share-row">
      <ShareBtn testID="viewer-share-whatsapp-button" label="WhatsApp" icon="message-circle" onPress={whatsapp} bg={WHATSAPP_GREEN} fg={WHATSAPP_ON} border={WHATSAPP_GREEN} />
      <ShareBtn testID="viewer-share-sms-button" label="SMS" icon="message-square" onPress={sms} bg={colors.surfaceTertiary} fg={colors.onSurface} border={colors.border} />
      <ShareBtn testID="viewer-share-more-button" label="Altro" icon="share-2" onPress={other} bg={colors.surfaceTertiary} fg={colors.onSurface} border={colors.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  label: { fontFamily: fonts.bold, fontSize: 15 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
