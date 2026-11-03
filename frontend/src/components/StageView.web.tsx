import { createElement, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/src/theme";
import { stageUrl, type StageCmd, type StageEvent, type StageHandle } from "./stage-types";

type Props = {
  mode: "viewer" | "sender";
  onEvent: (e: StageEvent) => void;
  ref?: Ref<StageHandle>;
  testID: string;
};

export function StageView({ mode, onEvent, ref, testID }: Props) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const handler = useRef(onEvent);
  handler.current = onEvent;
  const [key, setKey] = useState(0);

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data && data.type) handler.current(data);
      } catch {
        /* ignore malformed */
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  useImperativeHandle(ref, () => ({
    send: (c: StageCmd) => frame.current?.contentWindow?.postMessage(JSON.stringify({ ...c, __cmd: true }), "*"),
    reload: () => setKey((k) => k + 1),
  }));

  return (
    <View style={styles.wrap} testID={testID}>
      {createElement("iframe", {
        key,
        ref: frame,
        src: stageUrl(mode),
        title: "Scena VR180",
        allow: "camera; microphone; autoplay; fullscreen",
        style: { border: 0, width: "100%", height: "100%", background: colors.stage, display: "block" },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.stage, overflow: "hidden" },
});
