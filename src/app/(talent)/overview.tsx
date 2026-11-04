import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { ConnectionRequests } from "@/components/shared";
import {
  AppText,
  Avatar,
  CategoryCard,
  CategoryPill,
  EmptyText,
  LoadingBlock,
  Screen,
  StatCard,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts } from "@/lib/colors";
import {
  getMyAgencyLink,
  getMyConnectionRequests,
  listMyContent,
  listMyIdeas,
} from "@/lib/data";
import {
  JUMP_TILES,
  buildContinueFeed,
  buildOverviewStats,
  type ContinueFeedItem,
  type OverviewStats,
} from "@/lib/home";
import { displayName, greeting } from "@/lib/profile";
import { avatarPublicUrl } from "@/lib/supabase";
import { categoryCard } from "@/lib/ui";
import type { ConnectionRequest } from "@/lib/types";

type OverviewData = {
  stats: OverviewStats;
  feed: ContinueFeedItem[];
  agencyName: string | null;
  requests: ConnectionRequest[];
};

export default function TalentOverviewScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const currency = profile.currency?.trim() || "USD";
    const [content, ideas, agencyLink, requests] = await Promise.all([
      listMyContent(profile.id),
      listMyIdeas(profile.id),
      getMyAgencyLink(profile.id),
      getMyConnectionRequests(profile.id),
    ]);
    setData({
      stats: buildOverviewStats(content, currency),
      feed: buildContinueFeed(content, ideas),
      agencyName: agencyLink?.status === "active" ? agencyLink.agencyName : null,
      requests,
    });
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!profile || !data) return <LoadingBlock />;

  const name = displayName(profile).trim() || "there";
  const firstName = name.split(/\s+/)[0] || name;

  return (
    <Screen
      tabs
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load().finally(() => setRefreshing(false));
      }}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Profile"
          onPress={() => router.push("/(talent)/profile")}
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <Avatar name={name} size="lg" src={avatarPublicUrl(profile.avatar_path, profile.updated_at)} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="heading" style={{ fontSize: 24, lineHeight: 29 }}>
            {greeting()}, {firstName}
          </AppText>
          <AppText variant="caption" style={{ fontSize: 14, lineHeight: 19, marginTop: 2 }}>
            {data.stats.inProgress} in progress · {data.stats.paymentsDue} payments due
          </AppText>
        </View>
      </View>

      {data.agencyName ? (
        <View style={styles.agency}>
          <Icon name="link" size={14} color={colors.primary} weight="bold" />
          <AppText variant="caption" style={{ fontSize: 14, flexShrink: 1 }}>
            Connected with{" "}
            <AppText variant="caption" style={{ fontSize: 14, fontFamily: fonts.sansMedium, color: colors.ink }}>
              {data.agencyName}
            </AppText>
          </AppText>
        </View>
      ) : null}

      <ConnectionRequests
        requests={data.requests}
        currentAgency={data.agencyName}
        onAnswered={() => void load()}
      />

      <View style={styles.grid2}>
        <StatCard label="Revenue (paid)" value={data.stats.revenue} tone="collab" />
        <StatCard label="Due this week" value={data.stats.dueThisWeek} tone="payment" />
      </View>

      <AppText variant="title" style={styles.heading}>
        Jump to
      </AppText>
      <View style={styles.tiles}>
        {JUMP_TILES.map((tile) => (
          <Pressable
            key={tile.href}
            onPress={() => router.navigate(tile.href as never)}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: categoryCard[tile.category].bg },
              pressed && {
                borderColor: categoryCard[tile.category].border,
                transform: [{ translateY: -2 }],
              },
            ]}
          >
            <AppText variant="title" style={{ fontSize: 15 }}>
              {tile.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <AppText variant="title" style={styles.heading}>
        Continue creating
      </AppText>
      <View style={{ gap: 12 }}>
        {data.feed.map((item) => (
          <Pressable
            key={`${item.pill}-${item.id}`}
            onPress={() => router.navigate(item.href as never)}
            style={({ pressed }) => pressed && { opacity: 0.85 }}
          >
            <CategoryCard category={item.category}>
              <CategoryPill category={item.category} label={item.pill} />
              <AppText variant="cardTitle" style={{ marginTop: 10, fontSize: 16 }}>
                {item.title}
              </AppText>
              <AppText variant="caption" style={{ marginTop: 2, fontSize: 14 }}>
                {item.meta}
              </AppText>
            </CategoryCard>
          </Pressable>
        ))}
        {data.feed.length === 0 ? (
          <EmptyText>Nothing yet — add your first piece of content or jot down an idea.</EmptyText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  agency: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.collab,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  grid2: { flexDirection: "row", gap: 12, marginBottom: 24 },
  heading: { fontSize: 19, marginBottom: 12 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  tile: {
    width: "47.5%",
    flexGrow: 1,
    paddingVertical: 24,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
});
