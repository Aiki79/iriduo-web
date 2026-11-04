import { Feather } from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/src/components/ui";
import { deleteMemory, listMemories, shareFile, type Memory } from "@/src/media";
import { colors, fonts, radius, spacing } from "@/src/theme";

const isWeb = Platform.OS === "web";
const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
const when = (t: number) => (t ? new Date(t).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

function Action({ icon, label, onPress, testID, danger }: { icon: "eye" | "share-2" | "trash-2"; label: string; onPress: () => void; testID: string; danger?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.action, danger && styles.actionDanger, pressed && styles.pressed]}>
      <Feather name={icon} size={18} color={danger ? colors.onError : colors.onSurface} />
    </Pressable>
  );
}

export default function Gallery() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Memory[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setItems(listMemories());
    }, []),
  );

  return (
    <View style={styles.root} testID="gallery-screen">
      <Header title="Ricordi 3D" />
      <FlatList
        testID="gallery-list"
        data={items}
        keyExtractor={(i) => i.name}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        renderItem={({ item }) => (
          <View style={styles.card} testID={`gallery-item-${item.name}`}>
            {item.kind === "photo" ? (
              <Image source={{ uri: item.uri }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.videoThumb]}>
                <Feather name="film" size={32} color={colors.brandPrimary} />
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.title}>{item.kind === "photo" ? "Foto 3D" : "Video della chiamata"}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {when(item.at)} · {mb(item.size)}
              </Text>
              <View style={styles.actions}>
                <Action
                  testID={`gallery-view-${item.name}`}
                  icon="eye"
                  label="Guarda in 3D"
                  onPress={() => router.push({ pathname: "/viewer", params: item.kind === "photo" ? { photo: item.name } : { video: item.name } })}
                />
                <Action testID={`gallery-share-${item.name}`} icon="share-2" label="Condividi" onPress={() => shareFile(item.uri, item.kind === "photo" ? "image/jpeg" : "video/mp4")} />
                {confirm === item.name ? (
                  <Pressable
                    testID={`gallery-delete-confirm-${item.name}`}
                    onPress={() => {
                      deleteMemory(item.name);
                      setConfirm(null);
                      setItems(listMemories());
                    }}
                    style={({ pressed }) => [styles.confirm, pressed && styles.pressed]}
                  >
                    <Text style={styles.confirmText}>Elimina</Text>
                  </Pressable>
                ) : (
                  <Action testID={`gallery-delete-${item.name}`} icon="trash-2" label="Elimina" onPress={() => setConfirm(item.name)} danger />
                )}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty} testID="gallery-empty">
            <Feather name="image" size={40} color={colors.muted} />
            <Text style={styles.emptyTitle}>{isWeb ? "Galleria disponibile sul telefono" : "Ancora nessun ricordo"}</Text>
            <Text style={styles.emptyText}>
              {isWeb
                ? "Nel browser foto e video vengono scaricati come file. Nell'app sul telefono restano qui, pronti da riguardare in 3D."
                : "Durante una chiamata tocca Foto 3D o Registra: troverai qui foto e video, pronti da riguardare in 3D."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, flexGrow: 1 },
  card: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  thumb: { width: 128, height: 64, borderRadius: radius.sm, backgroundColor: colors.stage },
  videoThumb: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  action: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  actionDanger: { backgroundColor: colors.error, borderColor: colors.error },
  confirm: { height: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.error },
  confirmText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onError },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.onSurface, textAlign: "center" },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 21 },
});
