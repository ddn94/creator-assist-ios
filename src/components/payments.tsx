import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon } from "@/components/Icon";
import { DateField, SelectField } from "@/components/pickers";
import { Sheet } from "@/components/Sheet";
import {
  AppText,
  Avatar,
  Button,
  CategoryCard,
  Field,
  StatusTag,
  styles as ui,
} from "@/components/ui";
import type { InvoicePatch } from "@/lib/api";
import { colors, fonts } from "@/lib/colors";
import { paymentStatusTone, type PaymentItem } from "@/lib/payments";
import { toDateInput } from "@/lib/timestamps";
import { PAYMENT_TERM_OPTIONS, type PaymentTerms } from "@/lib/tracker";

/** Website PaymentCard (talent, phone layout). */
export function PaymentCard({
  payment,
  onOpen,
  onMarkPaid,
  onMarkInvoiced,
}: {
  payment: PaymentItem;
  onOpen?: () => void;
  onMarkPaid: (id: string) => void;
  onMarkInvoiced: (id: string, terms: PaymentTerms) => void;
}) {
  const [terms, setTerms] = useState<PaymentTerms>(payment.paymentTerms ?? "net_30");
  const overdue = payment.status === "overdue";

  return (
    <CategoryCard category="payment" style={{ padding: 18 }}>
      <View style={styles.top}>
        <Pressable onPress={onOpen} disabled={!onOpen} style={{ flex: 1 }}>
          <AppText variant="title" style={{ fontSize: 16 }}>
            {payment.content}
          </AppText>
        </Pressable>
        <StatusTag label={payment.statusLabel} tone={paymentStatusTone[payment.status]} />
      </View>
      <AppText variant="caption" style={{ marginTop: 2, fontSize: 14 }}>
        {payment.brand} · {payment.platform}
      </AppText>
      <View style={styles.amountRow}>
        <AppText variant="stat" style={{ lineHeight: 28 }}>
          {payment.fee}
        </AppText>
        <AppText
          variant="caption"
          style={[{ fontSize: 14, marginBottom: 2 }, overdue && { color: colors.danger, fontFamily: fonts.sansSemi }]}
        >
          {payment.due
            ? `Due ${payment.due}`
            : `${payment.termsLabel ?? "Terms TBD"} · not invoiced`}
        </AppText>
      </View>
      <AppText variant="caption" style={{ marginTop: 4 }}>
        {payment.deliverables}
        {payment.paid ? ` · Paid ${payment.paid}` : ""}
      </AppText>
      {payment.action === "markInvoiced" ? (
        <View style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <SelectField
              title="Payment terms"
              value={terms}
              options={[...PAYMENT_TERM_OPTIONS]}
              onChange={(value) => setTerms(value as PaymentTerms)}
            />
          </View>
          <Button label="Mark invoiced" style={{ height: 44 }} onPress={() => onMarkInvoiced(payment.id, terms)} />
        </View>
      ) : null}
      {payment.action === "markPaid" ? (
        <Button label="Mark paid" full style={{ marginTop: 12, height: 44 }} onPress={() => onMarkPaid(payment.id)} />
      ) : null}
    </CategoryCard>
  );
}

/** Website agency PaymentRow, laid out as a card for the phone. */
export function AgencyPaymentCard({
  payment,
  onEdit,
  onOpenTalent,
}: {
  payment: PaymentItem;
  onEdit: () => void;
  onOpenTalent?: () => void;
}) {
  const overdue = payment.status === "overdue";
  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [
        ui.card,
        { padding: 16 },
        overdue && { backgroundColor: colors.organic, borderColor: "rgba(217,105,90,0.25)" },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.top}>
        <Pressable
          onPress={onOpenTalent}
          disabled={!onOpenTalent}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}
        >
          <Avatar name={payment.talentName ?? payment.content} size="sm" />
          <AppText variant="cardTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
            {payment.talentName}
          </AppText>
        </Pressable>
        <StatusTag label={payment.statusLabel} tone={paymentStatusTone[payment.status]} />
      </View>
      <AppText variant="cardTitle" style={{ marginTop: 10, fontSize: 15 }}>
        {payment.content}
      </AppText>
      <AppText variant="caption" style={{ marginTop: 2 }}>
        {payment.brand} · {payment.fee}
        {payment.termsLabel ? ` · ${payment.termsLabel}` : ""}
      </AppText>
      <View style={styles.dates}>
        <DateCell label="Delivered" value={payment.delivered} />
        <DateCell label="Invoiced" value={payment.invoiced} />
        <DateCell label="Due" value={payment.due} danger={overdue} />
        <DateCell label="Paid" value={payment.paid} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
        {payment.action === "setInvoice" ? (
          <Button label="Set invoice date" size="xs" onPress={onEdit} />
        ) : (
          <AppText variant="caption" style={{ fontFamily: fonts.sansMedium }}>
            Edit
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

function DateCell({ label, value, danger }: { label: string; value: string | null; danger?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="label" style={{ fontSize: 10 }}>
        {label}
      </AppText>
      <AppText
        variant="caption"
        style={[{ marginTop: 2, color: colors.ink }, danger && { color: colors.danger, fontFamily: fonts.sansMedium }]}
      >
        {value ?? "—"}
      </AppText>
    </View>
  );
}

type PaymentEditProps = {
  payment: PaymentItem | null;
  open: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (patch: InvoicePatch) => void;
};

/** Website PaymentEditModal (agency). Keyed so each open starts from the saved row. */
export function PaymentEditModal(props: PaymentEditProps) {
  const { payment } = props;
  return (
    <PaymentEditForm
      key={
        payment
          ? `${payment.id}:${payment.dateInvoicedIso}:${payment.datePaidIso}:${payment.paymentTerms}:${props.open}`
          : "closed"
      }
      {...props}
    />
  );
}

function PaymentEditForm({ payment, open, error, onClose, onSave }: PaymentEditProps) {
  const [invoiced, setInvoiced] = useState(toDateInput(payment?.dateInvoicedIso));
  const [terms, setTerms] = useState<PaymentTerms>(payment?.paymentTerms ?? "net_30");
  const [paid, setPaid] = useState(toDateInput(payment?.datePaidIso));

  if (!payment) return null;

  function save() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiced)) return;
    if (paid && !/^\d{4}-\d{2}-\d{2}$/.test(paid)) return;
    onSave({ dateInvoiced: invoiced, paymentTerms: terms, datePaid: paid || null });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit payment details"
      description="Update the invoice date, payment terms, and paid date for this deal."
      footer={
        <>
          <Button label="Save changes" full disabled={!invoiced} onPress={save} />
          <Button label="Cancel" variant="secondary" full onPress={onClose} />
        </>
      }
    >
      <View style={{ gap: 16 }}>
        {error ? (
          <AppText variant="caption" style={{ color: colors.danger }}>
            {error}
          </AppText>
        ) : null}
        <View style={styles.summary}>
          <Avatar name={payment.talentName ?? payment.content} size="sm" />
          <View style={{ flex: 1 }}>
            <AppText variant="cardTitle">{payment.talentName ?? payment.content}</AppText>
            <AppText variant="caption" numberOfLines={1} style={{ color: colors.ink, marginTop: 2 }}>
              {payment.talentName ? payment.content : payment.brand}
            </AppText>
            <View style={styles.metaRow}>
              <Meta icon="brand" text={payment.brand} />
              <Meta icon="globe" text={payment.platform} />
              <Meta icon="money" text={payment.fee} />
            </View>
          </View>
        </View>
        <Field label="Invoice date" hint="The date the invoice was issued to the brand.">
          <DateField title="Invoice date" value={invoiced} onChange={setInvoiced} />
        </Field>
        <Field label="Payment terms" hint="How long the brand has to pay the invoice.">
          <SelectField
            title="Payment terms"
            value={terms}
            options={[...PAYMENT_TERM_OPTIONS]}
            onChange={(value) => setTerms(value as PaymentTerms)}
            placeholder="Select terms"
          />
        </Field>
        <Field label="Date paid" hint="Leave blank if the brand has not paid yet.">
          <DateField title="Date paid" value={paid} onChange={setPaid} />
        </Field>
        <View style={styles.info}>
          <Icon name="info" size={15} color={colors.paymentPill} />
          <AppText variant="caption" style={{ flex: 1, color: colors.ink, lineHeight: 18 }}>
            Status is calculated from the delivery date, invoice date, payment terms, and paid date.
          </AppText>
        </View>
      </View>
    </Sheet>
  );
}

function Meta({ icon, text }: { icon: "brand" | "globe" | "money"; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Icon name={icon} size={12} color={colors.muted} weight="bold" />
      <AppText variant="caption">{text}</AppText>
    </View>
  );
}

/** Website NeedsAttentionCard. */
export function NeedsAttentionCard({
  name,
  project,
  detail,
  amount,
  overdue = false,
  onOpen,
}: {
  name: string;
  project: string;
  detail: string;
  amount: string;
  overdue?: boolean;
  onOpen?: () => void;
}) {
  return (
    <View style={[ui.card, { padding: 14, gap: 8 }, overdue && { borderColor: "rgba(217,105,90,0.4)" }]}>
      <View style={styles.top}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <Avatar name={name} size="sm" />
          <AppText variant="cardTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </AppText>
        </View>
        <AppText variant="title">{amount}</AppText>
      </View>
      <View style={[styles.top, { alignItems: "center" }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="cardTitle" numberOfLines={1}>
            {project}
          </AppText>
          <AppText variant="caption" style={[{ marginTop: 2 }, overdue && { color: colors.danger }]}>
            {detail}
          </AppText>
        </View>
        {onOpen ? <Button label="Open" variant="secondary" style={{ height: 40 }} onPress={onOpen} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  dates: { flexDirection: "row", gap: 8, marginTop: 12 },
  summary: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: 12,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  info: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.payment,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
