import { useEffect, useState } from "react";
import { Animated, Easing, Image, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@/lib/colors";

/** Must match `imageWidth` for expo-splash-screen in app.json. */
const LOGO_SIZE = 96;
/** Minimum time the splash stays up, measured from JS start. */
const MIN_VISIBLE_MS = 1500;
/** Extra beat after the app is ready so the first redirect settles under the overlay. */
const SETTLE_MS = 200;
const FADE_MS = 400;
/** Delay between the overlay logo loading and fading out the native splash. */
const HANDOFF_DELAY_MS = 120;

const startedAt = Date.now();

/**
 * A JS copy of the native splash, drawn in exactly the same spot. It takes over
 * from the native splash as soon as it paints, holds until the app is ready and
 * the minimum time has passed, then fades out to reveal the first screen.
 */
export function SplashOverlay({ ready }: { ready: boolean }) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [scale] = useState(() => new Animated.Value(1));
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(SETTLE_MS, MIN_VISIBLE_MS - (Date.now() - startedAt));
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.08,
          duration: FADE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => setDone(true));
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, opacity, scale]);

  if (done) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.container, { opacity }]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image
          source={require("@/assets/images/splash-icon.png")}
          style={styles.logo}
          fadeDuration={0}
          onLoadEnd={() => {
            // Load end can fire before the image is on screen; give it a beat to paint
            // so removing the native splash never exposes an empty frame.
            setTimeout(() => {
              void SplashScreen.hideAsync();
            }, HANDOFF_DELAY_MS);
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    zIndex: 1000,
    elevation: 1000,
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
});
