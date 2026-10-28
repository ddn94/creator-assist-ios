import { Redirect } from "expo-router";
import { LoadingBlock } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { ready, session, profile, configured } = useAuth();

  if (!ready) return <LoadingBlock />;
  if (!configured || !session) return <Redirect href="/(auth)/landing" />;
  if (!profile) return <LoadingBlock />;
  if (!profile.onboarding_completed_at) return <Redirect href="/onboarding" />;
  if (profile.role === "agency") return <Redirect href="/(agency)/overview" />;
  return <Redirect href="/(talent)/overview" />;
}
