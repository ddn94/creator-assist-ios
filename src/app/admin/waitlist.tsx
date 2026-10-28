import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import {
  AppText,
  BackLink,
  FilterPills,
  FormAlert,
  LoadingBlock,
  PageHeader,
  Pagination,
  Screen,
  StatusTag,
  styles as ui,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { listWaitlist, type WaitlistEntry } from "@/lib/api";
import { colors, fonts } from "@/lib/colors";

const PAGE_SIZE = 20;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "used", label: "Used" },
] as const;

type WaitlistFilter = (typeof FILTERS)[number]["id"];

function formatJoined(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Pressable
      accessibilityLabel={copied ? "Copied" : `Copy invite code ${code}`}
      onPress={async () => {
        await Clipboard.setStringAsync(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.background : colors.card,
        paddingHorizontal: 10,
        paddingVertical: 5,
      })}
    >
      <Icon name={copied ? "check" : "copy"} size={12} weight="bold" />
      <AppText variant="caption" style={{ fontFamily: fonts.sansMedium, color: colors.ink }}>
        {copied ? "Copied" : "Copy"}
      </AppText>
    </Pressable>
  );
}

/** Website /admin/waitlist + WaitlistTable. */
export default function AdminWaitlistScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<WaitlistEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<WaitlistFilter>("all");
  const [page, setPage] = useState(0);
  const admin = isAdminEmail(profile?.email);

  const load = useCallback(async () => {
    if (!admin) return;
    const result = await listWaitlist();
    if ("error" in result) {
      setError(result.error);
      setItems([]);
      return;
    }
    setError(null);
    setItems(result.items);
  }, [admin]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const counts = useMemo(() => {
    const next = { all: 0, pending: 0, used: 0 };
    for (const item of items ?? []) {
      next.all += 1;
      if (item.consumedAt) next.used += 1;
      else next.pending += 1;
    }
    return next;
  }, [items]);

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  if (!admin) {
    return (
      <Screen>
        <PageHeader
          title="Waitlist"
          description="This page is only for admin accounts."
          back={<BackLink label="Back" onPress={back} />}
        />
      </Screen>
    );
  }
  if (!items) return <LoadingBlock />;

  const visible =
    filter === "pending"
      ? items.filter((item) => !item.consumedAt)
      : filter === "used"
        ? items.filter((item) => item.consumedAt)
        : items;
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, totalPages - 1);
  const pageItems = visible.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <Screen>
      <PageHeader
        title="Waitlist"
        description={`${items.length} total · ${counts.pending} pending · Copy a code and email it yourself`}
        back={<BackLink label="Back" onPress={back} />}
      />
      {error ? (
        <View style={{ marginBottom: 16 }}>
          <FormAlert error={error} />
        </View>
      ) : null}
      <FilterPills
        items={FILTERS.map((item) => ({ id: item.id, label: item.label, count: counts[item.id] }))}
        value={filter}
        onChange={(id) => {
          setFilter(id as WaitlistFilter);
          setPage(0);
        }}
      />
      <View style={[ui.card, { overflow: "hidden", marginTop: 16 }]}>
        {pageItems.map((row, index) => (
          <View
            key={row.id}
            style={[
              { paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
              index < pageItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <AppText variant="cardTitle" style={{ flex: 1 }} numberOfLines={1}>
                {row.email}
              </AppText>
              <StatusTag label={row.consumedAt ? "Used" : "Pending"} tone={row.consumedAt ? "paid" : "invited"} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <AppText variant="caption" selectable style={{ color: colors.ink, fontFamily: fonts.sansMedium, letterSpacing: 0.6 }}>
                {row.inviteCode} · <AppText variant="caption">{formatJoined(row.createdAt)}</AppText>
              </AppText>
              <CopyCodeButton code={row.inviteCode} />
            </View>
          </View>
        ))}
        {pageItems.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <AppText variant="description">
              {items.length === 0 ? "No one on the waitlist yet." : "No entries in this filter."}
            </AppText>
          </View>
        ) : null}
      </View>
      <Pagination page={current} pageSize={PAGE_SIZE} total={visible.length} onPageChange={setPage} />
    </Screen>
  );
}
