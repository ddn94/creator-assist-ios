import { Tabs } from "expo-router";
import { View } from "react-native";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { TourProvider } from "@/context/TourContext";
import { colors } from "@/lib/colors";

export default function TalentTabs() {
  return (
    <TourProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colors.background },
          }}
        >
          <Tabs.Screen name="overview" />
          <Tabs.Screen name="tracker" />
          <Tabs.Screen name="ideas" />
          <Tabs.Screen name="payments" />
          <Tabs.Screen name="pnl" />
          <Tabs.Screen name="profile" />
          <Tabs.Screen name="coming-soon" />
        </Tabs>
        <FloatingTabBar role="talent" />
      </View>
    </TourProvider>
  );
}
