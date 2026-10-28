import { Image, View } from "react-native";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { colors, fonts } from "@/lib/colors";

export function BrandLogo({ size = 44 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/images/brand-icon.png")}
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
    />
  );
}

/** Website not-found page. */
export function NotFound({
  label,
  description = "That page doesn’t exist, or you don’t have access to it.",
  onBack,
}: {
  label: string;
  description?: string;
  onBack: () => void;
}) {
  return (
    <Screen center>
      <View style={{ alignItems: "center" }}>
        <BrandLogo />
        <Card style={{ marginTop: 20, alignSelf: "stretch", alignItems: "center" }}>
          <AppText
            variant="nav"
            style={{ color: colors.primary, letterSpacing: 1.2, fontFamily: fonts.displaySemi }}
          >
            404
          </AppText>
          <AppText variant="heading" style={{ marginTop: 8 }}>
            Page not found
          </AppText>
          <AppText variant="description" style={{ marginTop: 6, textAlign: "center" }}>
            {description}
          </AppText>
          <Button label={label} full iconRight="forward" style={{ marginTop: 20 }} onPress={onBack} />
        </Card>
      </View>
    </Screen>
  );
}
