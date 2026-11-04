import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { NeedsAttentionCard, PaymentEditModal } from "@/components/payments";
import { RosterCard } from "@/components/roster";
import { showToast } from "@/components/Toast";
import {
  AppText,
  EmptyPanel,
  LoadingBlock,
  PageHeader,
  Pagination,
  Screen,
  StatCard,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { updateContentInvoice } from "@/lib/api";
import { colors } from "@/lib/colors";
import {
  getLinkedTalentAvatars,
  listAgencyLinkedContent,
  listTalentRecords,
} from "@/lib/data";
import {
  buildAgencyAttention,
  buildAgencyOverviewMoney,
  type AttentionItem,
} from "@/lib/home";
import { buildAgencyPayments } from "@/lib/paymentRows";
import { withInvoice, type PaymentItem } from "@/lib/payments";
import { talentStatusTone, type TalentItem } from "@/lib/talent";
import { toTalentItem } from "@/lib/talentItem";
import { attentionDetail, computeDueDate } from "@/lib/tracker";

const PAGE_SIZE = 4;

function talentFooter(items: TalentItem[]) {
  const count = (status: TalentItem["status"]) =>
    items.filter((item) => item.status === status).length;
  const summary = `${count("active")} active · ${count("invited")} invited · ${count("record")} not invited`;
  return [
    summary,
    count("disconnected") ? `${count("disconnected")} disconnected` : "",
    count("requested") ? `${count("requested")} requested` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

type Data = {
  talent: TalentItem[];
  money: ReturnType<typeof buildAgencyOverviewMoney>;
  attention: AttentionItem[];
  payments: PaymentItem[];
};

export default function AgencyOverviewScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [attentionPage, setAttentionPage] = useState(0);
  const [rosterPage, setRosterPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const [records, avatars, linked] = await Promise.all([
      listTalentRecords(),
      getLinkedTalentAvatars(profile.id),
      listAgencyLinkedContent(profile.id),
    ]);
    setData({
      talent: records.map((record) => toTalentItem(record, avatars.get(record.id) ?? null)),
      money: buildAgencyOverviewMoney(linked, profile.currency?.trim() || "USD"),
      attention: buildAgencyAttention(linked),
      payments: buildAgencyPayments(linked),
    });
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!profile || !data) return <LoadingBlock />;

  const brand = profile.agency_name?.trim() || "Workspace";
  const attentionStart = Math.min(attentionPage, Math.max(0, Math.ceil(data.attention.length / PAGE_SIZE) - 1)) * PAGE_SIZE;
  const rosterStart = Math.min(rosterPage, Math.max(0, Math.ceil(data.talent.length / PAGE_SIZE) - 1)) * PAGE_SIZE;
  const payment = data.payments.find((row) => row.id === openId) ?? null;

  return (
    <Screen
      tabs
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load().finally(() => setRefreshing(false));
      }}
    >
      <PageHeader title="Overview" description={`${brand} · ${data.talent.length} talent`} />

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard label="Talent" value={String(data.talent.length)} footer={talentFooter(data.talent)} tone="collab" />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard label="Outstanding" value={data.money.outstanding} footer={data.money.outstandingFooter} tone="payment" />
          <StatCard
            label="Overdue"
            value={data.money.overdue}
            footer={data.money.overdueFooter}
            tone="organic"
            valueColor={colors.danger}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard
            label="Received this month"
            value={data.money.received}
            footer={data.money.receivedFooter}
            tone="idea"
          />
        </View>
      </View>

      <AppText variant="title" style={{ fontSize: 18, marginTop: 28, marginBottom: 12 }}>
        Needs attention
      </AppText>
      {data.attention.length === 0 ? (
        <EmptyPanel>All clear.</EmptyPanel>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            {data.attention.slice(attentionStart, attentionStart + PAGE_SIZE).map((item) => (
              <NeedsAttentionCard
                key={item.id}
                name={item.name}
                project={item.project}
                detail={item.detail}
                amount={item.amount}
                overdue={item.overdue}
                onOpen={() => {
                  setSaveError(null);
                  setOpenId(item.id);
                }}
              />
            ))}
          </View>
          <Pagination
            page={attentionPage}
            pageSize={PAGE_SIZE}
            total={data.attention.length}
            onPageChange={setAttentionPage}
          />
        </>
      )}

      <AppText variant="title" style={{ fontSize: 18, marginTop: 28, marginBottom: 12 }}>
        Roster
      </AppText>
      {data.talent.length === 0 ? (
        <EmptyPanel>No talent yet. Add someone, or invite them onto Creator Assist.</EmptyPanel>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            {data.talent.slice(rosterStart, rosterStart + PAGE_SIZE).map((item) => (
              <RosterCard
                key={item.id}
                name={item.name}
                platforms={item.platformsFull}
                status={item.statusLabel}
                statusTone={talentStatusTone[item.status]}
                meta={item.email ?? item.lastActivity}
                avatarUrl={item.avatarUrl}
                onPress={() => router.navigate(`/(agency)/talent/${item.id}?from=overview` as never)}
              />
            ))}
          </View>
          <Pagination
            page={rosterPage}
            pageSize={PAGE_SIZE}
            total={data.talent.length}
            onPageChange={setRosterPage}
          />
        </>
      )}

      <PaymentEditModal
        payment={payment}
        open={payment != null}
        error={saveError}
        onClose={() => setOpenId(null)}
        onSave={(patch) => {
          if (!payment) return;
          const previous = data;
          const next = withInvoice(payment, patch);
          const dueIso = computeDueDate({
            paymentTerms: patch.paymentTerms,
            dateInvoiced: patch.dateInvoiced || null,
          });
          setData({
            ...data,
            attention:
              next.status === "paid"
                ? data.attention.filter((row) => row.id !== payment.id)
                : data.attention.map((row) =>
                    row.id === payment.id
                      ? {
                          ...row,
                          overdue: next.status === "overdue",
                          detail:
                            attentionDetail(next.status, {
                              dueIso,
                              deliveredLabel: payment.delivered,
                            }) ?? row.detail,
                        }
                      : row,
                  ),
          });
          setOpenId(null);
          void updateContentInvoice(profile, payment.id, patch).then((result) => {
            if (result.error) {
              setData(previous);
              setSaveError(result.error);
              setOpenId(payment.id);
              return;
            }
            showToast("Payment updated.");
            void load();
          });
        }}
      />
    </Screen>
  );
}
