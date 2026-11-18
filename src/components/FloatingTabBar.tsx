import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { TourTarget } from "@/components/TourTarget";
import { colors, fonts } from "@/lib/colors";

export type NavRole = "talent" | "agency";

type Tab = {
  href: string;
  /** Pathname prefix as usePathname reports it (groups are dropped). */
  path: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
  exact?: boolean;
};

type Center =
  | { mode: "tab"; tab: Tab }
  | { mode: "action"; href: string; label: string };

const NAV: Record<NavRole, { left: Tab[]; right: Tab[]; center: Center }> = {
  talent: {
    left: [
      { href: "/(talent)/overview", path: "/overview", label: "Overview", icon: "home", activeIcon: "homeFill", exact: true },
      { href: "/(talent)/ideas", path: "/ideas", label: "Ideas", icon: "ideas", activeIcon: "ideasFill" },
    ],
    right: [
      { href: "/(talent)/payments", path: "/payments", label: "Payments", icon: "payments", activeIcon: "paymentsFill" },
      { href: "/(talent)/pnl", path: "/pnl", label: "P&L", icon: "pnl", activeIcon: "pnlFill" },
    ],
    center: {
      mode: "tab",
      tab: { href: "/(talent)/tracker", path: "/tracker", label: "Tracker", icon: "tracker", activeIcon: "trackerFill" },
    },
  },
  agency: {
    left: [
      { href: "/(agency)/overview", path: "/overview", label: "Overview", icon: "home", activeIcon: "homeFill", exact: true },
      { href: "/(agency)/talent", path: "/talent", label: "Talent", icon: "talent", activeIcon: "talentFill" },
    ],
    right: [
      { href: "/(agency)/payments", path: "/payments", label: "Payments", icon: "payments", activeIcon: "paymentsFill" },
      { href: "/(agency)/pnl", path: "/pnl", label: "P&L", icon: "pnl", activeIcon: "pnlFill" },
    ],
    center: { mode: "action", href: "/(agency)/talent/new", label: "Add talent" },
  },
};

function isActive(pathname: string, tab: Tab) {
  return tab.exact
    ? pathname === tab.path
    : pathname === tab.path || pathname.startsWith(`${tab.path}/`);
}

/** Website MobileBottomNav items, docked to the bottom of the screen. */
export function FloatingTabBar({ role }: { role: NavRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const config = NAV[role];

  // Detail pages keep their own back navigation; hide the bar there like a stack.
  const hidden =
    pathname.endsWith("/new") ||
    /^\/tracker\/[^/]+$/.test(pathname) ||
    /^\/talent\/[^/]+\/content\//.test(pathname) ||
    pathname.startsWith("/profile/") ||
    pathname.startsWith("/coming-soon");
  if (hidden) return null;

  function go(href: string) {
    router.navigate(href as never);
  }

  const renderTab = (tab: Tab) => {
    const active = isActive(pathname, tab);
    return (
      <TourTarget key={tab.href} name={`tour-tab:${tab.path}`} radius={0} style={styles.tabTarget}>
        {/* Website tab links have no corner radius, so this cutout stays square. */}
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          accessibilityLabel={tab.label}
          onPress={() => go(tab.href)}
          style={styles.tab}
        >
          <Icon
            name={active ? tab.activeIcon : tab.icon}
            size={21}
            color={active ? colors.background : colors.white40}
            weight="regular"
          />
          <Text style={[styles.label, { color: active ? colors.background : colors.white40 }]}>
            {tab.label}
          </Text>
        </Pressable>
      </TourTarget>
    );
  };

  const center = config.center;
  const centerActive = center.mode === "tab" && isActive(pathname, center.tab);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      {/* Cap home-indicator padding — full insets.bottom leaves a tall empty band under the labels. */}
      <View
        style={[
          styles.bar,
          { paddingBottom: insets.bottom > 0 ? Math.min(insets.bottom, 12) : 8 },
        ]}
      >
        {config.left.map(renderTab)}
        <View style={styles.centerSlot} />
        {config.right.map(renderTab)}
      </View>
      {/* Sibling of the bar so the half above it still receives touches. */}
      <View pointerEvents="box-none" style={styles.centerWrap}>
        <TourTarget
          name={center.mode === "tab" ? `tour-tab:${center.tab.path}` : "tour-tab:add"}
          radius={28}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={center.mode === "tab" ? center.tab.label : center.label}
            onPress={() => go(center.mode === "tab" ? center.tab.href : center.href)}
            style={({ pressed }) => [
              styles.centerButton,
              pressed && { backgroundColor: colors.primaryHover },
            ]}
          >
            <Icon
              name={
                center.mode === "tab"
                  ? centerActive
                    ? center.tab.activeIcon
                    : center.tab.icon
                  : "plus"
              }
              size={center.mode === "tab" ? 24 : 26}
              color={colors.onPrimary}
              weight="bold"
            />
          </Pressable>
        </TourTarget>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Docked to the bottom edge. The negative margin lets the raised button
  // overlap the content above without taking layout space.
  wrap: { marginTop: -20, paddingTop: 20 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  tabTarget: { flex: 1 },
  tab: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  label: { fontFamily: fonts.displaySemi, fontSize: 10 },
  centerSlot: { width: 64 },
  centerWrap: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
});
