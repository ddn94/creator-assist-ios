import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthScreen, InlineLink } from "@/components/AuthScreen";
import { AppText, Button, FormAlert, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

const NOTICES: Record<string, string> = {
  profile: "Signed in, but this account has no profile yet.",
  link: "That link is invalid or has expired.",
};

/** Website /login. */
export default function LoginScreen() {
  const router = useRouter();
  const { error: notice } = useLocalSearchParams<{ error?: string }>();
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await signIn(email, password);
    setError(result);
    setPending(false);
  }

  return (
    <AuthScreen
      comfortable
      title="Creator Assist"
      description="Sign in to your creator workspace"
      card={
        <View style={{ gap: 14 }}>
          <FormAlert error={notice ? NOTICES[notice] : null} />
          {!configured ? (
            <FormAlert error="Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env (see .env.example)." />
          ) : null}
          <View style={{ gap: 4 }}>
            <AppText variant="label">Email</AppText>
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>
          <View style={{ gap: 4 }}>
            <AppText variant="label">Password</AppText>
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={() => void submit()}
              returnKeyType="go"
            />
          </View>
          <FormAlert error={error} />
          <Button
            label={pending ? "Signing in…" : "Sign in"}
            full
            iconRight="forward"
            disabled={pending || !configured}
            onPress={() => void submit()}
          />
        </View>
      }
      additional={
        <>
          <InlineLink label="Forgot password?" onPress={() => router.push("/(auth)/forgot")} />
          <InlineLink prefix="Don’t have an account?" label="Sign up" onPress={() => router.push("/(auth)/signup")} />
        </>
      }
    />
  );
}
