import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthScreen, InlineLink } from "@/components/AuthScreen";
import { AppText, Button, FormAlert, PillToggle, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/lib/types";

/** Website /signup/talent and /signup/agency, with the Creator / Agency toggle. */
export default function SignupScreen() {
  const router = useRouter();
  const { role: initialRole } = useLocalSearchParams<{ role?: string }>();
  const { signUp, configured } = useAuth();
  const [role, setRole] = useState<UserRole>(initialRole === "agency" ? "agency" : "talent");
  const [invite, setInvite] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const agency = role === "agency";

  async function submit() {
    setPending(true);
    setError(null);
    const result = await signUp({ email, password, invite, role });
    setPending(false);
    setError(result.error);
    setMessage(result.message);
  }

  return (
    <AuthScreen
      title={agency ? "Create your agency account" : "Create your account"}
      description={
        agency
          ? "Manage your roster’s deals and invoicing in one place."
          : "Track deals, content, and payments in one place."
      }
      aboveCard={
        <View style={{ marginBottom: 12 }}>
          <PillToggle
            items={[
              { id: "talent", label: "Creator" },
              { id: "agency", label: "Agency" },
            ]}
            value={role}
            onChange={(id) => setRole(id as UserRole)}
          />
        </View>
      }
      card={
        message ? (
          <FormAlert message={message} />
        ) : (
          <View style={{ gap: 12 }}>
            <View style={{ gap: 4 }}>
              <AppText variant="label">Invite code</AppText>
              <TextField
                value={invite}
                onChangeText={setInvite}
                placeholder="From your invite email"
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
              />
            </View>
            <View style={{ gap: 4 }}>
              <AppText variant="label">{agency ? "Work email" : "Email"}</AppText>
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
                placeholder="8+ characters"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
            </View>
            <FormAlert error={error} />
            <Button
              label={pending ? "Creating…" : "Create account"}
              full
              iconRight="forward"
              disabled={pending || !configured}
              onPress={() => void submit()}
            />
          </View>
        )
      }
      additional={
        <InlineLink prefix="Already have an account?" label="Sign in" onPress={() => router.push("/(auth)/login")} />
      }
    />
  );
}
