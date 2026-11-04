import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppText, Button, Screen } from "@/components/ui";

/** Website /overview/profile/coming-soon. */
export default function ComingSoonScreen() {
  const router = useRouter();
  const { f } = useLocalSearchParams<{ f?: string }>();
  const feature = typeof f === "string" && f.trim() ? f : "This section";

  return (
    <Screen center>
      <View style={{ alignItems: "center", paddingVertical: 48 }}>
        <AppText variant="heading" style={{ textAlign: "center" }}>
          {feature}
        </AppText>
        <AppText variant="description" style={{ marginTop: 8, textAlign: "center" }}>
          Not here yet. It&apos;s on the way.
        </AppText>
        <Button
          label="Back to profile"
          style={{ marginTop: 28 }}
          onPress={() => router.navigate("/(talent)/profile")}
        />
      </View>
    </Screen>
  );
}
