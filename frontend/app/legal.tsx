import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/src/components/ui";
import { colors, fonts, spacing } from "@/src/theme";

// Draft texts: to be reviewed by a lawyer and completed with the owner's details before publishing.
const DOCS: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Termini d'uso",
    body: [
      "1. Servizio. IriDuo permette videochiamate 3D tra persone che si scambiano un codice personale o un link di invito. Non esiste una ricerca pubblica di utenti né un elenco di persone.",
      "2. Età. Per usare IriDuo devi avere almeno 14 anni. Se hai meno di 14 anni puoi usarla solo con il permesso di un genitore o di chi esercita la responsabilità genitoriale.",
      "3. Comportamento. È vietato mostrare o condividere nudità, pornografia, violenza, contenuti illegali, e qualsiasi forma di molestia, minaccia, insulto, truffa o spam.",
      "4. Registrazioni. L'app registra una chiamata solo dopo il consenso esplicito dell'altra persona e mostra un avviso rosso per tutta la durata. Le registrazioni restano sul dispositivo di chi registra e non vengono mai salvate sui server di IriDuo.",
      "5. Blocco e segnalazioni. Puoi bloccare e segnalare un utente in qualsiasi momento. Un account segnalato da 3 utenti diversi viene sospeso automaticamente e non può più fare né ricevere chiamate.",
      "6. Codice personale. Puoi creare un nuovo codice quando vuoi: quello vecchio smette subito di funzionare.",
      "7. Responsabilità. Ogni utente è responsabile di ciò che mostra e condivide. Le chiamate passano direttamente tra i dispositivi in forma cifrata e non vengono visionate dal titolare dell'app.",
      "8. Reati. Se subisci un reato (minacce, ricatti, diffusione di immagini private) rivolgiti alla Polizia Postale: www.commissariatodips.it",
    ],
  },
  privacy: {
    title: "Informativa privacy",
    body: [
      "Titolare del trattamento: [nome e contatti del titolare da completare].",
      "Dati delle chiamate: video, audio e chat viaggiano direttamente tra i dispositivi con cifratura e non vengono salvati né visionati sui nostri server.",
      "Dati sul server: un identificativo casuale del dispositivo (non collegato al tuo nome), il codice personale finché sei in attesa di chiamata, e le segnalazioni inviate (motivo, nota facoltativa, identificativi casuali dei dispositivi coinvolti), usate solo per sospendere automaticamente gli account segnalati.",
      "Dati sul tuo telefono: rubrica, storico chiamate, foto 3D, registrazioni fatte con consenso e impostazioni restano solo sul tuo dispositivo.",
      "Nessuna pubblicità e nessuna cessione dei dati a terzi. Puoi chiedere la cancellazione dei dati scrivendo al titolare.",
    ],
  },
};

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const insets = useSafeAreaInsets();
  const d = DOCS[doc === "privacy" ? "privacy" : "terms"];
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
