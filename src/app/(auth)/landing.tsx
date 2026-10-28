import { useState } from "react";
import { LayoutAnimation, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { InlineLink } from "@/components/AuthScreen";
import { BrandLogo } from "@/components/NotFound";
import { AppText, Button, Card, FormAlert, Screen, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { joinWaitlist } from "@/lib/api";
import { colors } from "@/lib/colors";

const FAQS = [
  { q: "Who is this for?", a: "Creators managing brand deals, content, and payments." },
  { q: "When does it launch?", a: "Early access opens to the waitlist first, in waves." },
];

/** Website landing / waitlist page. */
export default function LandingScreen() {
  const router = useRouter();
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  async function join() {
    setPending(true);
    setError(null);
    const result = await joinWaitlist(email);
    setPending(false);
    if ("error" in result) setError(result.error);
    else setMessage(result.message);
  }

  return (
    <Screen center>
      <View style={{ alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <BrandLogo size={56} />
          <AppText variant="wordmark">Creator Assist</AppText>
        </View>
        <AppText variant="hero" style={{ marginTop: 28, textAlign: "center" }}>
          For creators running a business, not just a page.
        </AppText>
        <AppText variant="subtitle" style={{ marginTop: 18, textAlign: "center" }}>
          deals · payments · content — all in one place
        </AppText>
        <AppText variant="description" style={{ marginTop: 10 }}>
          Early access opening soon.
        </AppText>
      </View>

      <Card style={{ marginTop: 32 }}>
        {!configured ? (
          <View style={{ marginBottom: 12 }}>
            <FormAlert error="Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env (see .env.example)." />
          </View>
        ) : null}
        {message ? (
          <FormAlert message={message} />
        ) : (
          <View style={{ gap: 12 }}>
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              style={{ fontSize: 16 }}
            />
            <FormAlert error={error} />
            <Button
              label={pending ? "Joining…" : "Join the waitlist"}
              size="lg"
              full
              iconRight="forward"
              disabled={pending || !configured}
              onPress={() => void join()}
            />
            <AppText variant="caption" style={{ textAlign: "center" }}>
              Early access + founding pricing. No spam.
            </AppText>
          </View>
        )}
      </Card>

      <View style={{ marginTop: 24, gap: 10, paddingHorizontal: 4 }}>
        {FAQS.map(({ q, a }) => (
          <Pressable
            key={q}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setOpen((current) => (current === q ? null : q));
            }}
          >
            <AppText variant="nav" style={{ fontSize: 13, color: open === q ? colors.primaryHover : colors.muted }}>
              {q} <AppText variant="description">{open === q ? "−" : "+"}</AppText>
            </AppText>
            {open === q ? (
              <AppText variant="description" style={{ marginTop: 6 }}>
                {a}
              </AppText>
            ) : null}
          </Pressable>
        ))}
        <View style={{ marginTop: 18, gap: 8 }}>
          <InlineLink prefix="Already have an account?" label="Sign in" onPress={() => router.push("/(auth)/login")} />
          <InlineLink prefix="New here?" label="Sign up" onPress={() => router.push("/(auth)/signup")} />
        </View>
      </View>
    </Screen>
  );
}
