import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { loadTerms, setPending, termsAccepted } from "@/src/gate";
import { langChosen, loadLang, useLang } from "@/src/i18n";
import { queryClient } from "@/src/query-client";
import { colors, fonts } from "@/src/theme";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const [loaded] = useFonts({
    [fonts.regular]: require("../assets/fonts/AtkinsonHyperlegible-Regular.ttf"),
    [fonts.bold]: require("../assets/fonts/AtkinsonHyperlegible-Bold.ttf"),
    [fonts.display]: require("../assets/fonts/VarelaRound-Regular.ttf"),
  });

  const [langReady, setLangReady] = useState(false);
  useLang(); // re-render the whole tree when the language changes
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const router = useRouter();

  useEffect(() => {
    Promise.all([loadLang(), loadTerms()]).finally(() => setLangReady(true));
    if (Platform.OS !== "web") {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  }, []);

  // Language and terms come first on every entry, also when an invite link opens /sender directly.
  useEffect(() => {
    if (!langReady || !loaded) return;
    if (["/language", "/welcome", "/legal"].includes(pathname)) return;
    if (langChosen() && termsAccepted()) return;
    if (pathname !== "/") setPending({ pathname, params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
    router.replace(langChosen() ? "/welcome" : "/language");
  }, [langReady, loaded, pathname, params, router]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            {loaded && langReady ? (
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.surface },
                  animation: "slide_from_right",
                }}
              />
            ) : (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.brandPrimary} />
              </View>
            )}
          </KeyboardProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
});
