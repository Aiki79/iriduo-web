import { Feather } from "@react-native-vector-icons/feather";
import * as ExpoLinking from "expo-linking";
import { useState } from "react";
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";

import type { IconName } from "@/src/components/ui";
import { API_BASE, WEB_APP_BASE } from "@/src/api";
import { getLang, tr } from "@/src/i18n";
import { colors, fonts, radius, spacing } from "@/src/theme";

const WHATSAPP_GREEN = "#25D366"; // brand color, identical in every theme
const WHATSAPP_ON = "#0B2E17";

const joinLink = (code: string) =>
  `${API_BASE}/api/join?code=${code}&lang=${getLang()}&app=${encodeURIComponent(WEB_APP_BASE ?? ExpoLinking.createURL("/"))}`;

const message = (code: string) =>
  tr(
    `Ti aspetto su IriDuo — a tu per tu, in 3D! Il codice del mio visore è ${code}. Tocca il link per aprire l'app e chiamarmi in 3D: ${joinLink(code)}`,
    `I'm waiting for you on IriDuo — face to face, in 3D! My headset code is ${code}. Tap the link to open the app and call me in 3D: ${joinLink(code)}`,
  );

function ShareBtn({ label, icon, onPress, testID, bg, fg, border }: { label: string; icon: IconName; onPress: () => void; testID: string; bg: string; fg: string; border: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={tr(`Condividi il codice: ${label}`, `Share the code: ${label}`)}
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
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  const text = encodeURIComponent(message(code));

  const whatsapp = () => Linking.openURL(`https://wa.me/?text=${text}`).catch(() => {});
  const sms = () => Linking.openURL(Platform.OS === "ios" ? `sms:&body=${text}` : `sms:?body=${text}`).catch(() => {});
  const other = async () => {
    // Desktop browsers have no share sheet: copy the invite instead.
    if (Platform.OS === "web" && typeof navigator !== "undefined" && !navigator.share) {
      try {
        await navigator.clipboard.writeText(message(code));
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        /* clipboard blocked */
      }
      return;
    }
    try {
      await Share.share({ message: message(code) });
    } catch {
      /* share sheet dismissed or unavailable */
    }
  };
  const canShare = Platform.OS !== "web" || (typeof navigator !== "undefined" && !!navigator.share);

  return (
    <View style={styles.row} testID="viewer-share-row">
      <ShareBtn testID="viewer-share-whatsapp-button" label="WhatsApp" icon="message-circle" onPress={whatsapp} bg={WHATSAPP_GREEN} fg={WHATSAPP_ON} border={WHATSAPP_GREEN} />
      <ShareBtn testID="viewer-share-sms-button" label="SMS" icon="message-square" onPress={sms} bg={colors.surfaceTertiary} fg={colors.onSurface} border={colors.border} />
      <ShareBtn
        testID="viewer-share-more-button"
        label={copied ? tr("Copiato!", "Copied!") : canShare ? tr("Altro", "More") : tr("Copia invito", "Copy invite")}
        icon={copied ? "check" : canShare ? "share-2" : "copy"}
        onPress={other}
        bg={colors.surfaceTertiary}
        fg={colors.onSurface}
        border={colors.border}
      />
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
