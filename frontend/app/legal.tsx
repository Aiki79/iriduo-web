import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/src/components/ui";
import { tr, useLang } from "@/src/i18n";
import { colors, fonts, spacing } from "@/src/theme";

// Draft texts: to be reviewed by a lawyer and completed with the owner's details before publishing.
const DOCS = (): Record<string, { title: string; body: string[] }> => ({
  terms: {
    title: tr("Termini d'uso", "Terms of use"),
    body: [
      tr("1. Servizio. IriDuo permette videochiamate 3D tra persone che si scambiano un codice personale o un link di invito. Non esiste una ricerca pubblica di utenti né un elenco di persone.", "1. Service. IriDuo enables 3D video calls between people who exchange a personal code or an invite link. There is no public user search and no list of people."),
      tr("2. Età. Per usare IriDuo devi avere almeno 14 anni. Se hai meno di 14 anni puoi usarla solo con il permesso di un genitore o di chi esercita la responsabilità genitoriale.", "2. Age. You must be at least 14 years old to use IriDuo. If you are under 14 you may use it only with the permission of a parent or legal guardian."),
      tr("3. Comportamento. È vietato mostrare o condividere nudità, pornografia, violenza, contenuti illegali, e qualsiasi forma di molestia, minaccia, insulto, truffa o spam.", "3. Conduct. Showing or sharing nudity, pornography, violence or illegal content, and any form of harassment, threats, insults, scams or spam, is forbidden."),
      tr("4. Registrazioni. L'app registra una chiamata solo dopo il consenso esplicito dell'altra persona e mostra un avviso rosso per tutta la durata. Le registrazioni restano sul dispositivo di chi registra e non vengono mai salvate sui server di IriDuo.", "4. Recordings. The app records a call only after the other person's explicit consent and shows a red warning the whole time. Recordings stay on the recording person's device and are never saved on IriDuo servers."),
      tr("5. Blocco e segnalazioni. Puoi bloccare e segnalare un utente in qualsiasi momento. Un account segnalato da 3 utenti diversi viene sospeso automaticamente e non può più fare né ricevere chiamate.", "5. Blocking and reports. You can block and report a user at any time. An account reported by 3 different users is suspended automatically and can no longer make or receive calls."),
      tr("6. Codice personale. Puoi creare un nuovo codice quando vuoi: quello vecchio smette subito di funzionare.", "6. Personal code. You can create a new code whenever you want: the old one stops working immediately."),
      tr("7. Responsabilità. Ogni utente è responsabile di ciò che mostra e condivide. Le chiamate passano direttamente tra i dispositivi in forma cifrata e non vengono visionate dal titolare dell'app.", "7. Responsibility. Each user is responsible for what they show and share. Calls travel directly between devices, encrypted, and are never viewed by the app owner."),
      tr("8. Reati. Se subisci un reato (minacce, ricatti, diffusione di immagini private) rivolgiti alla Polizia Postale: www.commissariatodips.it", "8. Crimes. If you are the victim of a crime (threats, blackmail, sharing of private images), contact the police. In Italy: www.commissariatodips.it"),
    ],
  },
  privacy: {
    title: tr("Informativa privacy", "Privacy policy"),
    body: [
      tr("Titolare del trattamento: [nome e contatti del titolare da completare].", "Data controller: [owner's name and contact details to be completed]."),
      tr("Dati delle chiamate: video, audio e chat viaggiano direttamente tra i dispositivi con cifratura e non vengono salvati né visionati sui nostri server.", "Call data: video, audio and chat travel directly between devices, encrypted, and are never stored or viewed on our servers."),
      tr("Dati sul server: un identificativo casuale del dispositivo (non collegato al tuo nome), il codice personale finché sei in attesa di chiamata, e le segnalazioni inviate (motivo, nota facoltativa, identificativi casuali dei dispositivi coinvolti), usate solo per sospendere automaticamente gli account segnalati.", "Data on the server: a random device identifier (not linked to your name), your personal code while you are waiting for a call, and submitted reports (reason, optional note, random identifiers of the devices involved), used only to automatically suspend reported accounts."),
      tr("Dati sul tuo telefono: rubrica, storico chiamate, foto 3D, registrazioni fatte con consenso e impostazioni restano solo sul tuo dispositivo.", "Data on your phone: address book, call history, 3D photos, recordings made with consent and settings stay only on your device."),
      tr("Nessuna pubblicità e nessuna cessione dei dati a terzi. Puoi chiedere la cancellazione dei dati scrivendo al titolare.", "No advertising and no sharing of data with third parties. You can request deletion of your data by writing to the owner."),
    ],
  },
});

export default function Legal() {
  useLang();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const insets = useSafeAreaInsets();
  const d = DOCS()[doc === "privacy" ? "privacy" : "terms"];
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} testID="legal-screen">
      <Header title={d.title} />
      {d.body.map((t, i) => (
        <Text key={i} style={styles.p}>
          {t}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { gap: spacing.md },
  p: { paddingHorizontal: spacing.lg, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.onSurface },
});
