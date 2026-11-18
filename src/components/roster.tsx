import { useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { Icon } from "@/components/Icon";
import { TourTarget } from "@/components/TourTarget";
import { DateField, SelectField } from "@/components/pickers";
import { showToast } from "@/components/Toast";
import {
  AppText,
  Avatar,
  Button,
  Card,
  Field,
  FormAlert,
  StatusTag,
  TextField,
  styles as ui,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { inviteTalent, updateContentInvoice } from "@/lib/api";
import { colors, fonts } from "@/lib/colors";
import {
  dealPaymentTone,
  talentStatusTone,
  type TalentDeal,
  type TalentDetail,
  type TalentInvoicing,
  type TalentItem,
} from "@/lib/talent";
import { formatShortDayMonth } from "@/lib/time";
import { toDateInput } from "@/lib/timestamps";
import { PAYMENT_TERM_OPTIONS, type PaymentTerms } from "@/lib/tracker";
import type { StatusTagTone } from "@/lib/ui";

function dash(value: string | null) {
  return value ?? "—";
}

/** Website RosterCard (agency Overview). */
export function RosterCard({
  name,
  platforms,
  status,
  statusTone = "record",
  meta,
  avatarUrl = null,
  onPress,
}: {
  name: string;
  platforms: string;
  status: string;
  statusTone?: StatusTagTone;
  meta: string;
  avatarUrl?: string | null;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [ui.card, { padding: 14 }, pressed && { backgroundColor: colors.background }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={name} size="md" src={avatarUrl} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.between}>
            <AppText variant="cardTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
              {name}
            </AppText>
            <StatusTag label={status} tone={statusTone} />
          </View>
          <View style={styles.between}>
            <AppText variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
              {platforms}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {meta}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Website TalentRow (mobile card layout). */
export function TalentRow({
  talent,
  last,
  onPress,
}: {
  talent: TalentItem;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.divider,
        pressed && { backgroundColor: colors.background },
      ]}
    >
      <Avatar name={talent.name} size="sm" src={talent.avatarUrl} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[styles.between, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="cardTitle" numberOfLines={1}>
              {talent.name}
            </AppText>
            <AppText variant="caption" numberOfLines={1} style={{ marginTop: 2 }}>
              {talent.email ?? "—"}
            </AppText>
          </View>
          <StatusTag label={talent.statusLabel} tone={talentStatusTone[talent.status]} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>
          <AppText variant="caption">{talent.platforms}</AppText>
          {talent.community ? <AppText variant="caption">{talent.community}</AppText> : null}
        </View>
        <View style={styles.between}>
          <AppText variant="caption">
            {talent.liveDeals != null
              ? `${talent.liveDeals} live · ${dash(talent.outstanding)}`
              : dash(talent.outstanding)}
          </AppText>
          <AppText variant="caption">{talent.lastActivity}</AppText>
        </View>
      </View>
      <Icon name="chevronRight" size={13} color={colors.muted} weight="bold" />
    </Pressable>
  );
}

/** Website TalentProfileHeader. */
export function TalentProfileHeader({ talent }: { talent: TalentDetail }) {
  const meta = [
    talent.community ? `${talent.community} community` : "",
    talent.platformsFull,
    talent.niches,
    talent.location,
  ]
    .filter(Boolean)
    .join(" · ");
  const notes = talent.notes?.trim() || "";
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <Avatar name={talent.name} size="lg" src={talent.avatarUrl} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <AppText variant="heading" style={{ fontSize: 24 }}>
            {talent.name}
          </AppText>
          <StatusTag label={talent.statusLabel} tone={talentStatusTone[talent.status]} />
        </View>
        {meta ? (
          <AppText variant="caption" style={{ marginTop: 6, lineHeight: 18 }}>
            {meta}
          </AppText>
        ) : null}
        {notes ? (
          <AppText variant="caption" style={{ marginTop: 6, lineHeight: 18 }}>
            {notes}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/** Website DealTable (phone rows). */
export function DealTable({
  deals,
  onOpen,
}: {
  deals: TalentDeal[];
  onOpen: (id: string) => void;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <AppText variant="title" style={{ fontSize: 18, marginBottom: 12 }}>
        Deals
      </AppText>
      <TourTarget name="tour-deal" radius={24} style={[ui.card, { overflow: "hidden" }]}>
        {deals.map((deal, index) => (
          <Pressable
            key={deal.id}
            onPress={() => onOpen(deal.id)}
            style={({ pressed }) => [
              { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
              index < deals.length - 1 && styles.divider,
              pressed && { backgroundColor: colors.background },
            ]}
          >
            <View style={[styles.between, { alignItems: "flex-start" }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="cardTitle" numberOfLines={1}>
                  {deal.content}
                </AppText>
                <AppText variant="caption" style={{ marginTop: 2 }}>
                  {dash(deal.brand)} · {deal.platform}
                </AppText>
              </View>
              {deal.payment && deal.paymentLabel ? (
                <StatusTag label={deal.paymentLabel} tone={dealPaymentTone[deal.payment]} />
              ) : (
                <AppText variant="caption" style={{ color: colors.ink }}>
                  —
                </AppText>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <AppText variant="caption" style={{ color: colors.ink }}>
                {dash(deal.fee)}
              </AppText>
              <AppText variant="caption" style={{ color: colors.ink }}>
                {deal.stage}
              </AppText>
            </View>
          </Pressable>
        ))}
        {deals.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <AppText variant="description">No deals yet.</AppText>
          </View>
        ) : null}
      </TourTarget>
    </View>
  );
}

/** Website InvoicingCard. */
export function InvoicingCard({
  items,
  readOnly = false,
  onSaved,
}: {
  items: TalentInvoicing[];
  readOnly?: boolean;
  onSaved: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={{ marginBottom: 24 }}>
      <AppText variant="title" style={{ fontSize: 18, marginBottom: 12 }}>
        Invoicing
      </AppText>
      <View style={{ gap: 12 }}>
        {items.map((invoicing) => (
          <InvoicingEditor
            key={`${invoicing.contentId}:${invoicing.dateInvoiced}:${invoicing.paymentTerms}:${invoicing.datePaid}:${invoicing.dueNote}`}
            invoicing={invoicing}
            readOnly={readOnly}
            onSaved={onSaved}
          />
        ))}
      </View>
    </View>
  );
}

function InvoicingEditor({
  invoicing,
  readOnly,
  onSaved,
}: {
  invoicing: TalentInvoicing;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [invoiced, setInvoiced] = useState(toDateInput(invoicing.dateInvoiced));
  const [terms, setTerms] = useState<PaymentTerms>(invoicing.paymentTerms);
  const [paid, setPaid] = useState(toDateInput(invoicing.datePaid));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (readOnly || !profile) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiced)) return;
    if (paid && !/^\d{4}-\d{2}-\d{2}$/.test(paid)) return;
    setError(null);
    setSaved(true);
    const result = await updateContentInvoice(profile, invoicing.contentId, {
      dateInvoiced: invoiced,
      paymentTerms: terms,
      datePaid: paid || null,
    });
    if (result.error) {
      setSaved(false);
      setError(result.error);
      return;
    }
    showToast("Invoicing saved.");
    onSaved();
  }

  return (
    <Card padding={16}>
      <Pressable
        disabled={readOnly}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((value) => !value);
        }}
        style={[styles.between, { alignItems: "flex-start" }]}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="cardTitle" style={{ fontSize: 16 }}>
            {invoicing.dealTitle}
          </AppText>
          <AppText variant="caption" style={{ marginTop: 4 }}>
            {invoicing.summary}
          </AppText>
          {open ? null : (
            <AppText variant="caption" style={{ marginTop: 4 }}>
              {invoicing.dueNote}
            </AppText>
          )}
        </View>
        {readOnly ? null : (
          <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }], padding: 6 }}>
            <Icon name="chevronDown" size={14} color={colors.muted} weight="bold" />
          </View>
        )}
      </Pressable>
      {open ? (
        <View style={{ gap: 12, marginTop: 16 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Field label="Date invoiced" style={{ flex: 1 }}>
              <DateField
                title="Date invoiced"
                value={invoiced}
                onChange={(next) => {
                  setInvoiced(next);
                  setSaved(false);
                }}
              />
            </Field>
            <Field label="Date paid" style={{ flex: 1 }}>
              <DateField
                title="Date paid"
                value={paid}
                onChange={(next) => {
                  setPaid(next);
                  setSaved(false);
                }}
              />
            </Field>
          </View>
          <Field label="Payment terms">
            <SelectField
              title="Payment terms"
              value={terms}
              options={[...PAYMENT_TERM_OPTIONS]}
              onChange={(value) => {
                setTerms(value as PaymentTerms);
                setSaved(false);
              }}
            />
          </Field>
          <Button
            label={saved ? "Saved" : "Save invoicing"}
            full
            disabled={!invoiced}
            onPress={() => void save()}
          />
          <AppText variant="caption" style={error ? { color: colors.danger } : undefined}>
            {error ?? invoicing.dueNote}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

/** Website TalentInviteCard. */
export function TalentInviteCard({
  id,
  email,
  inviteCode,
  declinedAt = null,
  status = "record",
  onInvited,
}: {
  id: string;
  email: string | null;
  inviteCode: string | null;
  declinedAt?: string | null;
  status?: "record" | "invited" | "disconnected" | "requested";
  onInvited: () => void;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === "requested") {
    return (
      <Card padding={18} style={{ marginBottom: 24 }}>
        <AppText variant="title">Connection request sent</AppText>
        <AppText variant="description" style={{ marginTop: 4 }}>
          {email ?? "This talent"} already has an account. They&apos;ll see your request on their
          Overview.
        </AppText>
      </Card>
    );
  }

  const reconnect = status === "disconnected";

  if (inviteCode && !reconnect) {
    return (
      <Card padding={18} style={{ marginBottom: 24 }}>
        <AppText variant="title">Invite code created</AppText>
        <AppText variant="heading" selectable style={{ marginTop: 4, letterSpacing: 1.5, fontFamily: fonts.displayHeavy }}>
          {inviteCode}
        </AppText>
        <AppText variant="description" style={{ marginTop: 8 }}>
          Send it to {email ?? "this talent"}. They create a talent account with this email and
          code.
        </AppText>
      </Card>
    );
  }

  async function invite() {
    setPending(true);
    setError(null);
    const result = await inviteTalent(id, email ?? inviteEmail.trim());
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    showToast(result.message);
    onInvited();
  }

  return (
    <Card padding={18} style={{ marginBottom: 24 }}>
      <AppText variant="title">{reconnect ? "Reconnect this talent" : "Invite this talent"}</AppText>
      {declinedAt ? (
        <AppText variant="description" style={{ marginTop: 4 }}>
          They declined on {formatShortDayMonth(declinedAt)}.
        </AppText>
      ) : null}
      <AppText variant="description" style={{ marginTop: 4 }}>
        {reconnect
          ? "They already have an account. Send a request. They answer it on Overview. You will see new content from the moment they accept, plus deals already on this card."
          : "Add their email. If they're already on Creator Assist, they'll get a connection request. If not, you'll get an invite code to send them."}
      </AppText>
      <View style={{ gap: 12, marginTop: 16 }}>
        {email ? (
          <AppText variant="description">{reconnect ? `Request ${email}` : `Invite ${email}`}</AppText>
        ) : (
          <Field label="Email">
            <TextField
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="name@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </Field>
        )}
        <FormAlert error={error} />
        <Button
          label={
            pending
              ? reconnect
                ? "Sending…"
                : "Inviting…"
              : reconnect
                ? "Send connection request"
                : "Invite"
          }
          style={{ alignSelf: "flex-start" }}
          disabled={pending || (!email && !inviteEmail.trim())}
          onPress={() => void invite()}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
});
