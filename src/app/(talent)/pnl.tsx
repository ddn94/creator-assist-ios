import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BreakdownList, CurrencyPicker, PnlDateRangeControl } from "@/components/shared";
import { TourTarget } from "@/components/TourTarget";
import {
  AppText,
  CategoryPill,
  EmptyText,
  ListCard,
  ListRow,
  LoadingBlock,
  PageHeader,
  Screen,
  StatCard,
  StatusTag,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/lib/colors";
import { listMyContent } from "@/lib/data";
import { pnlMoneyContext } from "@/lib/exchangeRates";
import { EMPTY_RATE_BOOK, type RateBook } from "@/lib/fx";
import { contentTypeCategory, contentTypeLabel } from "@/lib/pnl";
import {
  buildTalentPnlByBrand,
  buildTalentPnlByNiche,
  buildTalentPnlRows,
  buildTalentPnlSummary,
} from "@/lib/pnlData";
import type { PnlDateFilter } from "@/lib/pnlRange";
import { paymentStatusTone } from "@/lib/payments";
import { fmtMoney, type TrackerDetail } from "@/lib/tracker";

export default function TalentPnlScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState<TrackerDetail[] | null>(null);
  const [money, setMoney] = useState<{ currencies: string[]; rates: RateBook }>({
    currencies: [],
    rates: EMPTY_RATE_BOOK,
  });
  const [filter, setFilter] = useState<PnlDateFilter>({ range: "all" });
  const [reportCurrency, setReportCurrency] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const home = profile?.currency?.trim() || "USD";
  const currency = reportCurrency ?? home;

  const load = useCallback(async () => {
    if (!profile) return;
    const items = await listMyContent(profile.id);
    const ctx = await pnlMoneyContext(profile.currency?.trim() || "USD", items);
    setContent(items);
    setMoney(ctx);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const report = useMemo(() => {
    const items = content ?? [];
    return {
      summary: buildTalentPnlSummary(items, filter, undefined, currency, money.rates),
      rows: buildTalentPnlRows(items, filter, undefined, currency, money.rates),
      byBrand: buildTalentPnlByBrand(items, filter, currency, money.rates),
      byNiche: buildTalentPnlByNiche(items, filter, currency, money.rates),
    };
  }, [content, filter, currency, money.rates]);

  if (!content) return <LoadingBlock />;
  const { summary, rows, byBrand, byNiche } = report;
  const fmt = (amount: number, code?: string) => fmtMoney(amount, code || summary.currency);

  return (
    <Screen
      tabs
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load().finally(() => setRefreshing(false));
      }}
    >
      <PageHeader title="P&L Dashboard" description="Revenue, expenses, and profit" />
      <PnlDateRangeControl
        variant="toggle"
        onChange={setFilter}
        accessory={
          <CurrencyPicker value={currency} currencies={money.currencies} onChange={setReportCurrency} />
        }
      />

      <TourTarget
        name="tour-pnl"
        radius={24}
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 20 }}
      >
        <StatCard style={{ minWidth: "46%" }} label="Total revenue" value={fmt(summary.revenue)} tone="collab" />
        <StatCard style={{ minWidth: "46%" }} label="Total expenses" value={fmt(summary.expenses)} tone="payment" />
        <StatCard
          style={{ minWidth: "46%" }}
          label="Net profit"
          value={fmt(summary.net)}
          tone="collab"
          valueColor={summary.net >= 0 ? colors.primaryHover : colors.danger}
        />
        <StatCard
          style={{ minWidth: "46%" }}
          label="Overdue"
          value={String(summary.overdue)}
          tone="card"
          valueColor={summary.overdue > 0 ? colors.danger : undefined}
        />
      </TourTarget>

      <ListCard title="Per-content P&L" style={{ marginTop: 24, marginBottom: 16 }}>
        {rows.map((row, index) => (
          <ListRow
            key={row.id}
            last={index === rows.length - 1}
            onPress={() => router.push(`/(talent)/tracker/${row.contentId}`)}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 }}>
                <CategoryPill category={contentTypeCategory(row.type)} label={contentTypeLabel(row.type)} />
                {row.paymentStatus && row.paymentLabel ? (
                  <StatusTag label={row.paymentLabel} tone={paymentStatusTone[row.paymentStatus]} />
                ) : null}
              </View>
              <AppText
                variant="stat"
                style={{ fontSize: 18, color: row.profit >= 0 ? colors.primaryHover : colors.danger }}
              >
                {fmt(row.profit, row.currency)}
              </AppText>
            </View>
            <AppText variant="cardTitle" style={{ marginTop: 8 }}>
              {row.title}
            </AppText>
            <AppText variant="caption" style={{ marginTop: 2 }}>
              {row.fee != null ? `Fee ${fmt(row.fee, row.currency)}` : "No fee"} · Expenses{" "}
              {fmt(row.expenses, row.currency)}
              {row.brand ? ` · ${row.brand}` : ""}
            </AppText>
          </ListRow>
        ))}
        {rows.length === 0 ? (
          <EmptyText>No revenue or expenses in this period.</EmptyText>
        ) : null}
      </ListCard>

      <BreakdownList title="By brand" rows={byBrand} currency={summary.currency} />
      <BreakdownList title="By niche" rows={byNiche} currency={summary.currency} />
    </Screen>
  );
}
