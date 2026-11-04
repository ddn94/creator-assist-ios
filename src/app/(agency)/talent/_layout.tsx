import { Stack } from "expo-router";
import { colors } from "@/lib/colors";

export default function TalentStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
