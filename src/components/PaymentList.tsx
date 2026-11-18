import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { TourTarget } from "@/components/TourTarget";
import { AgencyPaymentCard, PaymentCard, PaymentEditModal } from "@/components/payments";
import { showToast } from "@/components/Toast";
import { AppText, EmptyText, FilterPills } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import {
  markContentInvoiced,
  markContentPaid,
  updateContentInvoice,
} from "@/lib/api";
import { colors, fonts } from "@/lib/colors";
import {
  PAYMENT_STATUS_FILTERS,
  markInvoiced,
  markPaid,
  withInvoice,
  type PaymentItem,
  type PaymentMode,
  type PaymentStatus,
} from "@/lib/payments";
import type { PaymentTerms } from "@/lib/tracker";

type PaymentFilter = (typeof PAYMENT_STATUS_FILTERS)[number]["id"];

function parseDue(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = Date.parse(value);
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

/** Website PaymentList — status filters, due-date sort, optimistic actions. */
export function PaymentList({
  mode,
  items,
  onChanged,
}: {
  mode: PaymentMode;
  items: PaymentItem[];
  onChanged: () => void;
}) {
  const { profile } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  // Optimistic rows belong to one load, like the website's serverKey.
  const [draft, setDraft] = useState<{ items: PaymentItem[]; rows: Record<string, PaymentItem> }>({
    items,
    rows: {},
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const overrides = draft.items === items ? draft.rows : {};
    return items.map((item) => overrides[item.id] ?? item);
  }, [items, draft]);

  function replaceRow(next: PaymentItem) {
    setDraft((current) => ({
      items,
      rows: { ...(current.items === items ? current.rows : {}), [next.id]: next },
    }));
  }

  function restoreRow(id: string) {
    setDraft((current) => {
      const rows = { ...(current.items === items ? current.rows : {}) };
      delete rows[id];
      return { items, rows };
    });
  }

  const counts = useMemo(() => {
    const next: Record<"all" | PaymentStatus, number> = {
      all: rows.length,
      overdue: 0,
      awaiting_payment: 0,
      not_invoiced: 0,
      paid: 0,
    };
    for (const item of rows) next[item.status] += 1;
    return next;
  }, [rows]);

  const filtered = useMemo(() => {
    const mul = dir === "desc" ? -1 : 1;
    const sorted = [...rows].sort((a, b) => {
      const at = parseDue(a.due);
      const bt = parseDue(b.due);
      return mul * (at === bt ? 0 : at < bt ? -1 : 1);
    });
    return filter === "all" ? sorted : sorted.filter((item) => item.status === filter);
  }, [rows, dir, filter]);

  async function onMarkPaid(id: string) {
    const current = rows.find((row) => row.id === id);
    if (!current || !profile) return;
    replaceRow(markPaid(current));
    const result = await markContentPaid(profile, id);
    if (result.error) {
      restoreRow(id);
      showToast(result.error, "danger");
      return;
    }
    showToast(`“${current.content}” was marked as paid.`);
    onChanged();
  }

  async function onMarkInvoiced(id: string, terms: PaymentTerms) {
    const current = rows.find((row) => row.id === id);
    if (!current || !profile) return;
    replaceRow(markInvoiced(current, terms));
    const result = await markContentInvoiced(profile, id, terms);
    if (result.error) {
      restoreRow(id);
      showToast(result.error, "danger");
      return;
    }
    showToast(`“${current.content}” was marked as invoiced.`);
    onChanged();
  }

  const editing = rows.find((row) => row.id === editId) ?? null;
  const pills = PAYMENT_STATUS_FILTERS.map((item) => ({
    id: item.id,
    label: item.label,
    count: item.id === "all" || item.id === "paid" ? undefined : counts[item.id],
  }));

  return (
    <View>
      <FilterPills items={pills} value={filter} onChange={(id) => setFilter(id as PaymentFilter)} />
      <Pressable
        onPress={() => setDir((prev) => (prev === "asc" ? "desc" : "asc"))}
        hitSlop={8}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", marginTop: 12 }}
      >
        <Icon name="sort" size={12} color={colors.muted} weight="bold" />
        <AppText variant="caption" style={{ fontFamily: fonts.sansMedium }}>
          Due {dir === "asc" ? "soonest first" : "latest first"}
        </AppText>
      </Pressable>
      <TourTarget name="tour-payments" radius={24} style={{ marginTop: 10, gap: 12 }}>
        {filtered.map((payment) =>
          mode === "talent" ? (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onOpen={
                payment.contentHref
                  ? () => router.push(payment.contentHref as never)
                  : undefined
              }
              onMarkPaid={(id) => void onMarkPaid(id)}
              onMarkInvoiced={(id, terms) => void onMarkInvoiced(id, terms)}
            />
          ) : (
            <AgencyPaymentCard
              key={payment.id}
              payment={payment}
              onEdit={() => {
                setSaveError(null);
                setEditId(payment.id);
              }}
              onOpenTalent={
                payment.talentId
                  ? () => router.navigate(`/(agency)/talent/${payment.talentId}` as never)
                  : undefined
              }
            />
          ),
        )}
        {filtered.length === 0 ? (
          <EmptyText>
            {mode === "talent" && rows.length === 0
              ? "No paid collabs yet. Create one in Tracker with type “Paid collab”."
              : mode === "talent"
                ? "No deals in this filter."
                : "No payments in this filter."}
          </EmptyText>
        ) : null}
      </TourTarget>
      {mode === "agency" ? (
        <PaymentEditModal
          payment={editing}
          open={editing != null}
          error={saveError}
          onClose={() => setEditId(null)}
          onSave={(patch) => {
            if (!editing || !profile) return;
            const previous = editing;
            replaceRow(withInvoice(editing, patch));
            setEditId(null);
            void updateContentInvoice(profile, previous.id, patch).then((result) => {
              if (result.error) {
                restoreRow(previous.id);
                setSaveError(result.error);
                setEditId(previous.id);
                return;
              }
              showToast("Payment updated.");
              onChanged();
            });
          }}
        />
      ) : null}
    </View>
  );
}
