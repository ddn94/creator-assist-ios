import { useEffect } from "react";
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  Urbanist_600SemiBold,
  Urbanist_700Bold,
  Urbanist_800ExtraBold,
} from "@expo-google-fonts/urbanist";
import * as SplashScreen from "expo-splash-screen";
import { SplashOverlay } from "@/components/SplashOverlay";
import { ToastHost } from "@/components/Toast";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { handleAuthRedirect } from "@/lib/authLinks";
import { colors } from "@/lib/colors";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { ready, session, profile, configured, refreshProfile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function onUrl(url: string | null) {
      if (!url) return;
      if (!url.includes("auth/callback") && !url.includes("access_token")) return;
      const dest = await handleAuthRedirect(url);
      await refreshProfile();
      if (dest === "reset") router.replace("/(auth)/reset");
      else if (dest === "home") router.replace("/");
      else router.replace("/(auth)/login");
    }

    void Linking.getInitialURL().then(onUrl);
    const sub = Linking.addEventListener("url", ({ url }) => {
      void onUrl(url);
    });
    return () => sub.remove();
  }, [router, refreshProfile]);

  useEffect(() => {
    if (!ready) return;

    const path = segments as string[];
    const inAuth = path[0] === "(auth)";
    const authScreen = path[1];
    const inOnboarding = path[0] === "onboarding";
    const inReset = inAuth && authScreen === "reset";

    if (!configured) {
      if (!inAuth) router.replace("/(auth)/landing");
      return;
    }

    if (!session) {
      if (!inAuth) router.replace("/(auth)/landing");
      return;
    }

    // Recovery session: stay on reset password.
    if (inReset) return;

    if (!profile) return;

    if (!profile.onboarding_completed_at) {
      if (!inOnboarding) router.replace("/onboarding");
      return;
    }

    const inTalent = path[0] === "(talent)";
    const inAgency = path[0] === "(agency)";
    const inAdmin = path[0] === "admin";

    if (inAdmin) return;

    if (profile.role === "agency" && !inAgency) {
      router.replace("/(agency)/overview");
      return;
    }
    if (profile.role === "talent" && !inTalent) {
      router.replace("/(talent)/overview");
    }
  }, [ready, session, profile, configured, segments, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="(talent)" />
        <Stack.Screen name="(agency)" />
        <Stack.Screen name="admin/waitlist" />
      </Stack>
      <ToastHost />
      <SplashOverlay ready={ready} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
  });

  // Keep the native splash up until fonts load; SplashOverlay takes over from there.
  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
