import { Stack } from "expo-router";
import { colors } from "@/lib/colors";

export default function TrackerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
