import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CurrencyPicker, PnlDateRangeControl } from "@/components/shared";
import { TourTarget } from "@/components/TourTarget";
import {
  AppText,
  Avatar,
  Card,
  ListCard,
  ListRow,
  LoadingBlock,
  PageHeader,
  Screen,
  StatCard,
  StatusTag,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts } from "@/lib/colors";
import { listAgencyLinkedContent, type LinkedContentRow } from "@/lib/data";
import { pnlMoneyContext } from "@/lib/exchangeRates";
import { EMPTY_RATE_BOOK, type RateBook } from "@/lib/fx";
import type { PnlMetric } from "@/lib/pnl";
import {
  buildAgencyPnlBrands,
  buildAgencyPnlCurrencies,
  buildAgencyPnlTalent,
} from "@/lib/pnlData";
import type { PnlDateFilter } from "@/lib/pnlRange";
import type { StatCardTone } from "@/lib/ui";

const metricTone: Record<PnlMetric["tone"], StatCardTone> = {
  idea: "idea",
  collab: "collab",
  payment: "payment",
  organic: "organic",
  background: "organic",
};

function metricColor(metric: PnlMetric) {
  if (metric.valueClassName?.includes("danger") || metric.emphasize) return colors.danger;
  if (metric.valueClassName?.includes("primary")) return colors.primaryHover;
  return undefined;
}

/** Website /workspace/pnl + PnlDashboard. */
export default function AgencyPnlScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<LinkedContentRow[] | null>(null);
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
    const linked = await listAgencyLinkedContent(profile.id);
    const ctx = await pnlMoneyContext(
      profile.currency?.trim() || "USD",
      linked.map((row) => row.content),
    );
    setRows(linked);
    setMoney(ctx);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const report = useMemo(() => {
    const linked = rows ?? [];
    return {
      summary: buildAgencyPnlCurrencies(linked, currency, filter, money.rates)[0],
      talent: buildAgencyPnlTalent(linked, currency, filter, money.rates),
      brands: buildAgencyPnlBrands(linked, currency, filter, money.rates),
    };
  }, [rows, currency, filter, money.rates]);

  if (!rows) return <LoadingBlock />;
  const { summary, talent, brands } = report;

  return (
    <Screen
      tabs
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load().finally(() => setRefreshing(false));
      }}
    >
      <PageHeader title="P&L Dashboard" description="Revenue, expenses, and profit across the roster" />
      <PnlDateRangeControl
        onChange={setFilter}
        accessory={
          <CurrencyPicker value={currency} currencies={money.currencies} onChange={setReportCurrency} />
        }
      />

      {summary ? (
        <TourTarget name="tour-pnl" radius={24} style={{ marginTop: 16 }}>
        <Card padding={16}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <AppText variant="title" style={{ fontSize: 17 }}>
              {summary.name}
            </AppText>
            <StatusTag label={`${summary.talentCount} talent`} tone="record" />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {summary.metrics.map((metric) => (
              <StatCard
                key={metric.label}
                style={{ minWidth: "46%" }}
                label={metric.label}
                value={metric.value}
                tone={metricTone[metric.tone]}
                valueColor={metricColor(metric)}
              />
            ))}
          </View>
        </Card>
        </TourTarget>
      ) : (
        <TourTarget name="tour-pnl-fallback" style={{ marginTop: 16 }} />
      )}

      <ListCard title="By talent" style={{ marginTop: 24 }}>
        {talent.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <AppText variant="description">No financial activity in this period.</AppText>
          </View>
        ) : null}
        {talent.map((row, index) => (
          <ListRow
            key={row.id}
            last={index === talent.length - 1}
            onPress={() => router.navigate(`/(agency)/talent/${row.id}` as never)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar name={row.name} size="sm" />
              <View style={{ flex: 1 }}>
                <AppText variant="cardTitle" numberOfLines={1}>
                  {row.name}
                </AppText>
                <AppText variant="caption">{row.currency}</AppText>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4, marginTop: 8 }}>
              <AppText variant="caption" style={{ color: colors.ink }}>
                Revenue {row.revenue}
              </AppText>
              <AppText variant="caption" style={{ color: colors.ink }}>
                Expenses {row.expenses}
              </AppText>
              <AppText
                variant="caption"
                style={{
                  fontFamily: fonts.sansMedium,
                  color: row.profit.includes("-") ? colors.danger : colors.primaryHover,
                }}
              >
                Profit {row.profit}
              </AppText>
            </View>
          </ListRow>
        ))}
      </ListCard>

      <ListCard title="By brand" style={{ marginTop: 20 }}>
        {brands.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <AppText variant="description">No brands in this period.</AppText>
          </View>
        ) : null}
        {brands.map((row, index) => (
          <ListRow key={row.id} last={index === brands.length - 1}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <AppText variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>
                {row.name}
              </AppText>
              <AppText
                variant="caption"
                style={{ fontFamily: fonts.sansMedium, color: row.negative ? colors.danger : colors.primaryHover }}
              >
                {row.value}
              </AppText>
            </View>
          </ListRow>
        ))}
      </ListCard>
    </Screen>
  );
}
