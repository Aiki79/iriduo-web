import { useImperativeHandle, useRef, type Ref } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { colors } from "@/src/theme";
import { stageOrigin, stageUrl, type StageCmd, type StageEvent, type StageHandle } from "./stage-types";

type Props = {
  mode: "viewer" | "sender";
  onEvent: (e: StageEvent) => void;
  ref?: Ref<StageHandle>;
  testID: string;
};

export function StageView({ mode, onEvent, ref, testID }: Props) {
  const wv = useRef<WebView>(null);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useImperativeHandle(ref, () => ({
    send: (c: StageCmd) => wv.current?.injectJavaScript(`window.app&&window.app.cmd(${JSON.stringify(c)});true;`),
    reload: () => wv.current?.reload(),
  }));

  return (
    <View style={styles.wrap} testID={testID}>
      <WebView
        ref={wv}
        source={{ uri: stageUrl(mode) }}
        originWhitelist={[stageOrigin()]}
        onShouldStartLoadWithRequest={(r) => r.url.startsWith(`${stageOrigin()}/`) || r.url.startsWith("blob:") || r.url === "about:blank"}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        allowFileAccess={false}
        bounces={false}
        scrollEnabled={false}
        style={styles.web}
        onMessage={(e) => {
          try {
            handler.current(JSON.parse(e.nativeEvent.data));
          } catch {
            /* ignore malformed */
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.stage },
  web: { flex: 1, backgroundColor: colors.stage },
});
