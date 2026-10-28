import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { AuthScreen, InlineLink } from "@/components/AuthScreen";
import { AppText, Button, FormAlert, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

const SENT = "If an account exists for that email, a reset link is on its way.";

/** Website /auth/forgot. */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setPending(false);
    if (result) setError(result);
    else setSent(true);
  }

  return (
    <AuthScreen
      comfortable
      title="Reset your password"
      description={sent ? SENT : "Enter your email and we’ll send a reset link."}
      card={
        sent ? (
          <FormAlert message={SENT} />
        ) : (
          <View style={{ gap: 14 }}>
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
            <FormAlert error={error} />
            <Button
              label={pending ? "Sending…" : "Send reset link"}
              full
              iconRight="forward"
              disabled={pending}
              onPress={() => void submit()}
            />
          </View>
        )
      }
      additional={<InlineLink prefix="Remembered it?" label="Sign in" onPress={() => router.push("/(auth)/login")} />}
    />
  );
}
