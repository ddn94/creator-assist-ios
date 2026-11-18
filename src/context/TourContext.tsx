import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  readTourTarget,
  requestTourMeasure,
  SpotlightCorners,
  spotlightBands,
  spotlightShade,
  subscribeTourTargets,
  type TourBox,
} from "@/components/TourTarget";
import { useAuth } from "@/context/AuthContext";
import { completeProductTour } from "@/lib/api";
import { cardShadow, colors, fonts } from "@/lib/colors";
import { listTalentRecords } from "@/lib/data";
import { tourStartHref, tourSteps } from "@/lib/tour";

/**
 * Website ProductTour: runs once after onboarding while
 * profiles.onboarding.productTour is "pending". Skip stays put. Done goes home.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pending = profile?.onboarding.productTour === "pending";
  const steps = profile ? tourSteps(profile.role) : [];
  const [stepIndex, setStepIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (!pending || !profile || started.current === profile.id) return;
    started.current = profile.id;
    router.replace(tourStartHref(profile.role) as never);
  }, [pending, profile, router]);

  const visible = Boolean(pending && !closed && steps.length > 0);
  const step = steps[stepIndex] ?? null;
  const last = stepIndex >= steps.length - 1;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [spots, setSpots] = useState<{ content: TourBox; tab: TourBox | null } | null>(null);
  const [cardHeight, setCardHeight] = useState(200);

  useEffect(() => {
    if (!visible || !step) {
      setSpots(null);
      return;
    }
    const currentStep = step;
    let cancelled = false;
    setSpots(null);
    function same(a: TourBox | null, b: TourBox | null) {
      if (a === b) return true;
      if (!a || !b) return false;
      return (
        a.x === b.x &&
        a.y === b.y &&
        a.width === b.width &&
        a.height === b.height &&
        a.radius === b.radius
      );
    }
    function apply() {
      const content = readTourTarget(currentStep.target) ?? readTourTarget(currentStep.fallback);
      const tab = readTourTarget(`tour-tab:${currentStep.tab}`);
      if (cancelled || !content) return;
      setSpots((current) => {
        if (current && same(current.content, content) && same(current.tab, tab)) return current;
        return { content, tab };
      });
    }
    function refresh() {
      requestTourMeasure(currentStep.target);
      requestTourMeasure(currentStep.fallback);
      requestTourMeasure(`tour-tab:${currentStep.tab}`);
    }
    refresh();
    const timer = setInterval(refresh, 250);
    const unsubscribe = subscribeTourTargets(apply);
    return () => {
      cancelled = true;
      clearInterval(timer);
      unsubscribe();
    };
  }, [visible, step]);

  async function finish(goHome: boolean) {
    if (!profile) return;
    setClosed(true);
    if (goHome) {
      router.replace(profile.role === "agency" ? "/(agency)/overview" : "/(talent)/overview");
    }
    await completeProductTour(profile);
    await refreshProfile();
  }

  async function open(index: number) {
    const next = steps[index];
    if (!next || !profile) return;
    // The agency Deal step opens the first roster card, like the website.
    if (profile.role === "agency" && next.id === "deal") {
      const first = (await listTalentRecords())[0];
      if (first) {
        router.navigate(`/(agency)/talent/${first.id}` as never);
        return;
      }
    }
    router.navigate(next.href as never);
  }

  function goNext() {
    if (last) {
      void finish(true);
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    void open(next);
  }

  const contentSpot = spots?.content ?? null;
  const tabSpot = spots?.tab ?? null;
  const holes = [contentSpot, tabSpot].filter((hole): hole is TourBox => hole != null);
  const cardTop = contentSpot
    ? placeCard(contentSpot, tabSpot, screenHeight, cardHeight, Math.max(insets.top, 16))
    : null;

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void finish(false)}>
        <View style={styles.overlay}>
          <View style={StyleSheet.absoluteFill} />
          {spotlightBands(screenWidth, screenHeight, holes).map((band) =>
            band.spans.map((span) => (
              <View
                key={`${band.y}-${span.x}`}
                pointerEvents="none"
                style={[
                  styles.shade,
                  { top: band.y, height: band.height, left: span.x, width: span.width },
                ]}
              />
            )),
          )}
          <SpotlightCorners holes={holes} />
          {contentSpot ? (
            <View
              pointerEvents="none"
              style={[
                styles.lift,
                {
                  top: contentSpot.y,
                  left: contentSpot.x,
                  width: contentSpot.width,
                  height: contentSpot.height,
                  borderRadius: Math.min(
                    contentSpot.radius,
                    contentSpot.width / 2,
                    contentSpot.height / 2,
                  ),
                },
              ]}
            />
          ) : null}
          <View
            pointerEvents="box-none"
            style={[
              styles.cardWrap,
              cardTop == null
                ? { justifyContent: "flex-end", paddingBottom: Math.max(insets.bottom, 16) + 72 }
                : { paddingTop: cardTop },
            ]}
          >
          <View style={[styles.card, cardShadow]} onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}>
            <View style={styles.dots}>
              {steps.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.dot,
                    index === stepIndex && { width: 22, backgroundColor: colors.primary },
                    index < stepIndex && { backgroundColor: colors.collabBorder },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.eyebrow}>
              Step {stepIndex + 1} of {steps.length}
            </Text>
            <Text style={styles.title}>{step?.title ?? "Tour"}</Text>
            <Text style={styles.body}>{step?.body ?? ""}</Text>
            <View style={styles.actions}>
              <Pressable onPress={() => void finish(false)} hitSlop={8} style={styles.skip}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={goNext}
                style={({ pressed }) => [styles.primary, pressed && { backgroundColor: colors.primaryHover }]}
              >
                <Text style={styles.primaryText}>{last ? "Done" : "Next"}</Text>
              </Pressable>
            </View>
          </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/** Sit the card under the spotlight when it fits, otherwise above it. */
function placeCard(
  content: TourBox,
  tab: TourBox | null,
  screenHeight: number,
  cardHeight: number,
  topMargin: number,
) {
  const gap = 12;
  const bottomLimit = (tab?.y ?? screenHeight) - gap;
  const below = content.y + content.height + gap;
  const above = content.y - gap - cardHeight;
  if (below + cardHeight <= bottomLimit) return below;
  if (above >= topMargin) return above;
  return Math.max(topMargin, bottomLimit - cardHeight);
}

const styles = StyleSheet.create({
  overlay: { flex: 1, overflow: "visible" },
  shade: {
    position: "absolute",
    backgroundColor: spotlightShade,
  },
  // Website Dimmer lifts the spotlighted view: 0 14px 36px rgba(32, 37, 43, 0.28).
  lift: {
    position: "absolute",
    borderCurve: "circular",
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 14,
        blurRadius: 36,
        color: "rgba(32, 37, 43, 0.28)",
      },
    ],
  },
  cardWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dots: { flexDirection: "row", gap: 6, marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 6,
  },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginBottom: 6 },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: 18,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 14 },
  skip: { paddingHorizontal: 8, paddingVertical: 10 },
  skipText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.muted },
  primary: {
    paddingHorizontal: 24,
    height: 44,
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  primaryText: { fontFamily: fonts.display, fontSize: 15, color: colors.onPrimary },
});
