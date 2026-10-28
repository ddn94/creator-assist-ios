import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { AuthScreen, InlineLink } from "@/components/AuthScreen";
import { AppText, Button, FormAlert, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { updatePassword } from "@/lib/api";

/** Website /auth/reset + ResetPasswordForm. */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await updatePassword(password, confirm);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    await refreshProfile();
    router.replace("/");
  }

  return (
    <AuthScreen
      comfortable
      title="Set a new password"
      description="Choose a new password for your account"
      card={
        <View style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <AppText variant="label">New password</AppText>
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder="8+ characters"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </View>
          <View style={{ gap: 4 }}>
            <AppText variant="label">Repeat new password</AppText>
            <TextField
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Same again"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </View>
          <FormAlert error={error} />
          <Button
            label={pending ? "Saving…" : "Save new password"}
            full
            iconRight="forward"
            disabled={pending}
            onPress={() => void submit()}
          />
        </View>
      }
      additional={<InlineLink prefix="Back to" label="Sign in" onPress={() => router.replace("/(auth)/login")} />}
    />
  );
}
