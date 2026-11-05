import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, LogBox, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { colors, fonts } from "@/src/theme";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const [loaded] = useFonts({
    [fonts.regular]: require("../assets/fonts/AtkinsonHyperlegible-Regular.ttf"),
    [fonts.bold]: require("../assets/fonts/AtkinsonHyperlegible-Bold.ttf"),
    [fonts.display]: require("../assets/fonts/VarelaRound-Regular.ttf"),
  });

  useEffect(() => {
    if (Platform.OS !== "web") {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            {loaded ? (
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
