import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { PaymentList } from "@/components/PaymentList";
import { LoadingBlock, PageHeader, Screen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { listAgencyLinkedContent } from "@/lib/data";
import { buildAgencyPayments } from "@/lib/paymentRows";
import type { PaymentItem } from "@/lib/payments";

/** Website /workspace/payments. */
export default function AgencyPaymentsScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<PaymentItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setItems(buildAgencyPayments(await listAgencyLinkedContent(profile.id)));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!items) return <LoadingBlock />;

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
        description="Every deal across the roster · you set invoice dates and terms"
      />
      <PaymentList mode="agency" items={items} onChanged={() => void load()} />
    </Screen>
  );
}
