import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { completeProductTour } from "@/lib/api";
import { cardShadow, colors, fonts } from "@/lib/colors";
import { listTalentRecords } from "@/lib/data";
import { tourStartHref, tourSteps } from "@/lib/tour";

/**
 * Website ProductTour: runs once after onboarding while
 * profiles.onboarding.productTour is "pending". Skip stays put; Done goes home.
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

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void finish(false)}>
        <View style={[styles.backdrop, { paddingBottom: Math.max(insets.bottom, 16) + 72 }]}>
          <View style={[styles.card, cardShadow]}>
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
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(32,37,43,0.35)",
    justifyContent: "flex-end",
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
