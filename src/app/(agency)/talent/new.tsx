import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { showToast } from "@/components/Toast";
import {
  AppText,
  BackLink,
  Button,
  Card,
  Field,
  FormAlert,
  PageHeader,
  Screen,
  TextField,
} from "@/components/ui";
import { addTalent } from "@/lib/api";

/** Website /workspace/talent/new + AddTalentForm. */
export default function AddTalentScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    platform: "",
    handle: "",
    community: "",
    niche: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"invited" | "record" | null>(null);

  function back() {
    if (router.canGoBack()) router.back();
    else router.navigate("/(agency)/talent");
  }

  async function save(status: "invited" | "record") {
    setPending(status);
    setError(null);
    const result = await addTalent({ status, ...form });
    setPending(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    showToast(result.message);
    router.replace(`/(agency)/talent/${result.id}`);
  }

  const set = (key: keyof typeof form) => (value: string) => setForm({ ...form, [key]: value });

  return (
    <Screen>
      <PageHeader
        title="Add talent"
        description="Track someone now, invite them whenever you're ready"
        back={<BackLink label="Talent" onPress={back} />}
      />
      <Card>
        <View style={{ gap: 16 }}>
          <Field label="Name">
            <TextField value={form.name} onChangeText={set("name")} placeholder="Full name" autoCapitalize="words" />
          </Field>
          <Field label="Email" hint="Only needed to invite them. Until then, only you see this.">
            <TextField
              value={form.email}
              onChangeText={set("email")}
              placeholder="Optional — needed only to invite them"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </Field>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Field label="Primary platform" style={{ flex: 1 }}>
              <TextField value={form.platform} onChangeText={set("platform")} placeholder="Platform" />
            </Field>
            <Field label="Handle" style={{ flex: 1 }}>
              <TextField value={form.handle} onChangeText={set("handle")} placeholder="@handle" autoCapitalize="none" />
            </Field>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Field label="Community size" style={{ flex: 1 }}>
              <TextField
                value={form.community}
                onChangeText={set("community")}
                placeholder="e.g. 25,000"
                keyboardType="number-pad"
              />
            </Field>
            <Field label="Niche" style={{ flex: 1 }}>
              <TextField value={form.niche} onChangeText={set("niche")} placeholder="e.g. Fashion" />
            </Field>
          </View>
          <Field label="Notes">
            <TextField
              value={form.notes}
              onChangeText={set("notes")}
              placeholder="Optional notes about this talent"
              multiline
            />
          </Field>
        </View>
        {error ? (
          <View style={{ marginTop: 16 }}>
            <FormAlert error={error} />
          </View>
        ) : null}
        <View style={{ gap: 10, marginTop: 24 }}>
          <Button
            label={pending === "invited" ? "Saving…" : "Invite"}
            full
            disabled={pending !== null}
            onPress={() => void save("invited")}
          />
          <Button
            label={pending === "record" ? "Saving…" : "Save without inviting"}
            variant="secondary"
            full
            disabled={pending !== null}
            onPress={() => void save("record")}
          />
          <AppText variant="caption" style={{ textAlign: "center" }}>
            You can invite them later
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}
