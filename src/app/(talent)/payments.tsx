import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { PaymentList } from "@/components/PaymentList";
import { PaymentsOverdueBadge } from "@/components/shared";
import { LoadingBlock, PageHeader, Screen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { listMyContent } from "@/lib/data";
import { buildTalentPayments } from "@/lib/paymentRows";
import type { PaymentItem } from "@/lib/payments";

export default function TalentPaymentsScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<PaymentItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const currency = profile.currency?.trim() || "USD";
    setItems(buildTalentPayments(await listMyContent(profile.id), currency));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!items) return <LoadingBlock />;
  const overdueCount = items.filter((item) => item.status === "overdue").length;

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
        title="Payment Tracker"
        description="What’s owed, invoiced, and paid"
        action={<PaymentsOverdueBadge count={overdueCount} />}
      />
      <PaymentList mode="talent" items={items} onChanged={() => void load()} />
    </Screen>
  );
}
