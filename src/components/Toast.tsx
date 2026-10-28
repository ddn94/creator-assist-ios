import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { cardShadow, colors, fonts } from "@/lib/colors";

export type ToastTone = "success" | "danger";

type ToastItem = { id: number; message: string; tone: ToastTone };

/** Same timing as the website Toast. */
const TOAST_MS = 1500;
const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];
let nextId = 1;

function publish() {
  listeners.forEach((listener) => listener(items));
}

export function showToast(message: string, tone: ToastTone = "success") {
  const id = nextId++;
  items = [...items, { id, message, tone }];
  publish();
  setTimeout(() => {
    items = items.filter((item) => item.id !== id);
    publish();
  }, TOAST_MS);
}

function ToastRow({ item }: { item: ToastItem }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [opacity]);
  const danger = item.tone === "danger";
  return (
    <Animated.View style={[styles.toast, cardShadow, { opacity }]}>
      <View style={[styles.dot, { backgroundColor: danger ? colors.danger : colors.primary }]}>
        <Icon name={danger ? "close" : "check"} size={10} color={colors.onPrimary} weight="heavy" />
      </View>
      <Text style={styles.text} numberOfLines={3}>
        {item.message}
      </Text>
    </Animated.View>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastItem[]>(items);
  useEffect(() => {
    listeners.add(setCurrent);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  if (current.length === 0) return null;
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
      {current.map((item) => (
        <ToastRow key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 16, right: 16, gap: 8, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flexShrink: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
});
