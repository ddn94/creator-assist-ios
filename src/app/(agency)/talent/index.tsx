import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { TalentRow } from "@/components/roster";
import { TourTarget } from "@/components/TourTarget";
import {
  AppText,
  Button,
  FilterPills,
  LoadingBlock,
  PageHeader,
  Pagination,
  Screen,
  styles as ui,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import {
  getLinkedTalentAvatars,
  listAgencyLinkedContent,
  listTalentRecords,
} from "@/lib/data";
import { buildTalentRoster } from "@/lib/roster";
import type { TalentItem, TalentStatus } from "@/lib/talent";

const PAGE_SIZE = 8;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "invited", label: "Invited" },
  { id: "record", label: "Not invited" },
  { id: "disconnected", label: "Disconnected" },
  { id: "requested", label: "Requested" },
] as const;

type TalentFilter = (typeof FILTERS)[number]["id"];

export default function TalentRosterScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<TalentItem[] | null>(null);
  const [filter, setFilter] = useState<TalentFilter>("all");
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const [records, linked, avatars] = await Promise.all([
      listTalentRecords(),
      listAgencyLinkedContent(profile.id),
      getLinkedTalentAvatars(profile.id),
    ]);
    setItems(buildTalentRoster(records, linked, avatars));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const counts = useMemo(() => {
    const next = { all: 0, active: 0, invited: 0, record: 0, disconnected: 0, requested: 0 };
    for (const item of items ?? []) {
      next.all += 1;
      next[item.status] += 1;
    }
    return next;
  }, [items]);

  if (!items) return <LoadingBlock />;

  const filtered =
    filter === "all" ? items : items.filter((item) => item.status === (filter as TalentStatus));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <Screen
      tabs
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load().finally(() => setRefreshing(false));
      }}
    >
      <PageHeader
        title="Talent"
        description="Everyone you manage, on or off Creator Assist"
        action={
          <Button
            label="Add talent"
            iconLeft="plus"
            onPress={() => router.push("/(agency)/talent/new")}
          />
        }
      />
      <FilterPills
        items={FILTERS.map((item) => ({ id: item.id, label: item.label, count: counts[item.id] }))}
        value={filter}
        onChange={(id) => {
          setFilter(id as TalentFilter);
          setPage(0);
        }}
      />
      <TourTarget name="tour-roster" radius={24} style={[ui.card, { overflow: "hidden", marginTop: 16 }]}>
        {visible.map((talent, index) => (
          <TalentRow
            key={talent.id}
            talent={talent}
            last={index === visible.length - 1}
            onPress={() => router.push(`/(agency)/talent/${talent.id}`)}
          />
        ))}
        {visible.length === 0 ? (
          <View style={{ paddingVertical: 32, paddingHorizontal: 16, alignItems: "center" }}>
            <AppText variant="description" style={{ textAlign: "center" }}>
              {items.length === 0
                ? "No talent yet. Add someone, or invite them onto Creator Assist."
                : "No talent in this filter."}
            </AppText>
          </View>
        ) : null}
      </TourTarget>
      <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
    </Screen>
  );
}
