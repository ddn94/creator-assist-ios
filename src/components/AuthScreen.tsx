import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandLogo } from "@/components/NotFound";
import { AppText, Card, Screen } from "@/components/ui";

/** Website AuthScreen: logo, title, card, and links underneath. */
export function AuthScreen({
  title,
  description,
  aboveCard,
  card,
  additional,
  comfortable = false,
}: {
  title: string;
  description: string;
  aboveCard?: ReactNode;
  card: ReactNode;
  additional?: ReactNode;
  comfortable?: boolean;
}) {
  const router = useRouter();
  return (
    <Screen center>
      <View style={{ alignItems: "center", marginBottom: comfortable ? 20 : 14 }}>
        <Pressable
          accessibilityLabel="Creator Assist home"
          onPress={() => router.navigate("/(auth)/landing")}
        >
          <BrandLogo size={comfortable ? 52 : 46} />
        </Pressable>
        <AppText
          variant="heading"
          style={{ marginTop: comfortable ? 16 : 12, fontSize: comfortable ? 26 : 22, textAlign: "center" }}
        >
          {title}
        </AppText>
        <AppText variant="description" style={{ marginTop: 6, textAlign: "center" }}>
          {description}
        </AppText>
      </View>
      {aboveCard}
      <Card padding={comfortable ? 22 : 18}>{card}</Card>
      {additional ? (
        <View style={{ marginTop: 20, gap: 16, alignItems: "center" }}>{additional}</View>
      ) : null}
    </Screen>
  );
}

export function InlineLink({
  prefix,
  label,
  onPress,
}: {
  prefix?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {prefix ? <AppText variant="description">{prefix}</AppText> : null}
      <Pressable onPress={onPress} hitSlop={8}>
        <AppText
          variant="description"
          style={{ color: "#5d8471", fontFamily: "Inter_500Medium", textDecorationLine: "underline" }}
        >
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}
