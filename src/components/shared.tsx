import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Icon } from "@/components/Icon";
import { DateField, SelectField } from "@/components/pickers";
import { ConfirmModal } from "@/components/Sheet";
import { showToast } from "@/components/Toast";
import {
  AppText,
  Avatar,
  Button,
  Card,
  Checkbox,
  FilterPills,
  FormAlert,
  PillToggle,
  SettingsRow,
  TextField,
  styles as ui,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import {
  clearAvatar,
  deleteOwnAccount,
  disconnectTalentLink,
  respondConnectionRequest,
  setAvatar,
} from "@/lib/api";
import { colors, fonts } from "@/lib/colors";
import { activityWhen } from "@/lib/format";
import type { OtherPlatform, PlatformRow } from "@/lib/platforms";
import { PNL_PERIODS, type PnlDateFilter, type PnlRangeKind } from "@/lib/pnlRange";
import type { TalentActivityItem } from "@/lib/talent";
import { fmtMoney } from "@/lib/tracker";
import type { ConnectionRequest, UserRole } from "@/lib/types";

/** Website ActivityFeed — "Recent changes". */
export function ActivityFeed({ items }: { items: TalentActivityItem[] }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <AppText variant="title" style={{ fontSize: 18, marginBottom: 12 }}>
        Recent changes
      </AppText>
      <Card padding={16}>
        {items.length > 0 ? (
          <View style={{ gap: 14 }}>
            {items.map((item) => (
              <View key={item.id}>
                <AppText variant="cardTitle">{item.title}</AppText>
                <AppText variant="caption" style={{ marginTop: 2 }}>
                  {item.detail
                    ? `${item.detail} · ${activityWhen(item.when)}`
                    : activityWhen(item.when)}
                </AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText variant="description">No recent changes.</AppText>
        )}
      </Card>
    </View>
  );
}

/** Website ConnectionRequests on the talent Overview. */
export function ConnectionRequests({
  requests,
  currentAgency = null,
  onAnswered,
}: {
  requests: ConnectionRequest[];
  currentAgency?: string | null;
  onAnswered: () => void;
}) {
  const { profile } = useAuth();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alreadyConnected = Boolean(currentAgency);

  async function answer(request: ConnectionRequest, accept: boolean) {
    if (!profile || pendingId) return;
    if (accept && alreadyConnected) return;
    setPendingId(request.recordId);
    setError(null);
    const result = await respondConnectionRequest(profile, request.recordId, accept);
    setPendingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    showToast(
      accept
        ? `Connected to ${request.agencyName}.`
        : `Request from ${request.agencyName} declined.`,
    );
    onAnswered();
  }

  if (requests.length === 0) return null;

  return (
    <View style={{ marginBottom: 24, gap: 12 }}>
      <AppText variant="label" style={{ paddingHorizontal: 4 }}>
        Connection requests
      </AppText>
      {requests.map((request) => (
        <Card key={request.recordId} padding={18}>
          <AppText variant="title">{request.agencyName}</AppText>
          <AppText variant="description" style={{ marginTop: 4 }}>
            {currentAgency
              ? `You’re connected to ${currentAgency}. Disconnect from them before you accept. Past deals stay with ${currentAgency}. ${request.agencyName} only sees posts you add after you accept.`
              : "Wants to connect. Once you accept, they'll see the deals and content you add from then on. Anything older stays private."}
          </AppText>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            <Button
              label="Accept"
              disabled={alreadyConnected || pendingId === request.recordId}
              onPress={() => void answer(request, true)}
            />
            <Button
              label="Decline"
              variant="secondary"
              disabled={pendingId === request.recordId}
              onPress={() => void answer(request, false)}
            />
          </View>
        </Card>
      ))}
      {error ? <FormAlert error={error} /> : null}
    </View>
  );
}

/** Website DisconnectLink (talent row or agency text button). */
export function DisconnectLink({
  recordId,
  name,
  side,
  onDone,
}: {
  recordId: string;
  name: string;
  side: "talent" | "agency";
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const talent = side === "talent";

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await disconnectTalentLink(recordId);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    showToast(talent ? `Disconnected from ${name}.` : `${name} was disconnected.`);
    onDone();
  }

  const dialog = (
    <ConfirmModal
      open={open}
      title={talent ? `Disconnect from ${name}` : `Disconnect ${name}`}
      question={
        talent
          ? `Are you sure you want to disconnect from ${name}?`
          : `Are you sure you want to disconnect ${name}?`
      }
      detail={
        talent
          ? `Past deals stay with ${name}. A new agency does not see them. Anything you add after this is private until you connect with someone else.`
          : "Past deals stay shared. Anything they add after disconnecting is private."
      }
      confirmLabel="Disconnect"
      pendingLabel="Disconnecting…"
      pending={pending}
      error={error}
      onClose={() => setOpen(false)}
      onConfirm={() => void confirm()}
    />
  );

  const ask = () => {
    if (pending) return;
    setError(null);
    setOpen(true);
  };

  if (side === "agency") {
    return (
      <>
        <Pressable onPress={ask} hitSlop={10} disabled={pending}>
          <AppText variant="caption" style={{ fontSize: 14, fontFamily: fonts.sansMedium, color: colors.danger }}>
            Disconnect
          </AppText>
        </Pressable>
        {dialog}
      </>
    );
  }

  return (
    <>
      <SettingsRow
        title={`Disconnect from ${name}`}
        description="They keep the deals you've done together. A new agency won't see those."
        danger
        onPress={ask}
      />
      {dialog}
    </>
  );
}

/** Website DeleteAccountLink. */
export function DeleteAccountLink({
  role,
  connectedToAgency = false,
}: {
  role: UserRole;
  connectedToAgency?: boolean;
}) {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agency = role === "agency";
  const detail = agency
    ? "Your workspace and roster are removed. Creators keep their accounts, and any deals already on their side — including ones you logged that they claimed — plus the recent-change history on those deals."
    : connectedToAgency
      ? "Your account, content, ideas, and photo are removed. Your agency will keep a copy of the deals you did together."
      : "Your account, content, ideas, and photo are removed.";

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await deleteOwnAccount();
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setOpen(false);
    await signOut();
  }

  return (
    <>
      <SettingsRow
        title="Delete account"
        description={
          agency
            ? "Permanently remove this agency workspace and its data"
            : "Permanently remove your account and your data"
        }
        danger
        onPress={() => {
          if (pending) return;
          setError(null);
          setOpen(true);
        }}
      />
      <ConfirmModal
        open={open}
        title="Delete account?"
        question="This cannot be undone."
        detail={detail}
        confirmLabel="Delete account"
        pendingLabel="Deleting…"
        pending={pending}
        error={error}
        onClose={() => setOpen(false)}
        onConfirm={() => void confirm()}
      />
    </>
  );
}

/** Website ProfilePhoto — avatar with a camera badge. */
export function ProfilePhoto({
  userId,
  name,
  src,
  onChanged,
}: {
  userId: string;
  name: string;
  src: string | null;
  onChanged: () => Promise<unknown>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPending(true);
    const upload = await setAvatar(userId, asset.uri, asset.mimeType ?? "image/jpeg", asset.fileSize);
    if (upload.error) {
      setError(upload.error);
      setPending(false);
      return;
    }
    await onChanged();
    showToast("Photo updated.");
    setPending(false);
  }

  async function remove() {
    setError(null);
    setPending(true);
    const result = await clearAvatar(userId);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    await onChanged();
    showToast("Photo removed.");
    setPending(false);
  }

  return (
    <View style={{ alignItems: "center" }}>
      <View>
        <Avatar name={name} size="xl" src={src} />
        <Pressable
          accessibilityLabel={src ? "Change profile photo" : "Upload profile photo"}
          disabled={pending}
          onPress={() => void pick()}
          style={({ pressed }) => [
            styles.camera,
            (pressed || pending) && { backgroundColor: colors.primaryHover },
          ]}
        >
          <Icon name="camera" size={14} color={colors.onPrimary} weight="regular" />
        </Pressable>
      </View>
      {src ? (
        <Button
          variant="link"
          label="Remove photo"
          style={{ marginTop: 10 }}
          disabled={pending}
          onPress={() => void remove()}
        />
      ) : null}
      {error ? (
        <AppText variant="caption" style={{ marginTop: 8, color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

/** Website TalentPlatformGrid. */
export function TalentPlatformGrid({
  rows,
  other,
  onUpdateRow,
  onOtherChange,
}: {
  rows: PlatformRow[];
  other: OtherPlatform;
  onUpdateRow: (key: string, patch: Partial<PlatformRow>) => void;
  onOtherChange: (patch: Partial<OtherPlatform>) => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      {rows.map((row) => (
        <View key={row.key} style={{ gap: 8 }}>
          <Checkbox
            label={row.platform}
            checked={row.enabled}
            onChange={(enabled) => onUpdateRow(row.key, { enabled })}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <TextField
                placeholder="@handle (optional)"
                value={row.handle}
                editable={row.enabled}
                onChangeText={(handle) => onUpdateRow(row.key, { handle })}
                autoCapitalize="none"
              />
            </View>
            <View style={{ width: 112 }}>
              <TextField
                placeholder="Followers"
                value={row.followers}
                editable={row.enabled}
                keyboardType="number-pad"
                onChangeText={(followers) => onUpdateRow(row.key, { followers })}
              />
            </View>
          </View>
        </View>
      ))}
      <View style={{ gap: 8 }}>
        <Checkbox
          label="Other"
          checked={other.enabled}
          onChange={(enabled) => onOtherChange({ enabled })}
        />
        {other.enabled ? (
          <>
            <TextField
              placeholder="Platform name"
              value={other.platform}
              onChangeText={(platform) => onOtherChange({ platform })}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  placeholder="@handle"
                  value={other.handle}
                  autoCapitalize="none"
                  onChangeText={(handle) => onOtherChange({ handle })}
                />
              </View>
              <View style={{ width: 112 }}>
                <TextField
                  placeholder="Followers"
                  value={other.followers}
                  keyboardType="number-pad"
                  onChangeText={(followers) => onOtherChange({ followers })}
                />
              </View>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

function filterFor(range: PnlRangeKind, from: string, to: string): PnlDateFilter {
  return {
    range,
    from: range === "custom" ? from || undefined : undefined,
    to: range === "custom" ? to || undefined : undefined,
  };
}

/** Website PnlDateRangeControl. Talent uses the toggle, agency the pills. */
export function PnlDateRangeControl({
  onChange,
  variant = "pills",
  accessory,
}: {
  onChange: (filter: PnlDateFilter) => void;
  variant?: "pills" | "toggle";
  accessory?: ReactNode;
}) {
  const [range, setRange] = useState<PnlRangeKind>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "" });

  function selectRange(next: PnlRangeKind) {
    setRange(next);
    onChange(filterFor(next, applied.from, applied.to));
  }

  const periods = PNL_PERIODS.map((period) => ({
    id: period.id,
    label: variant === "toggle" && period.id === "last30" ? "30 days" : period.label,
  }));

  return (
    <View style={{ gap: 12 }}>
      {accessory}
      {variant === "toggle" ? (
        <PillToggle items={periods} value={range} onChange={(id) => selectRange(id as PnlRangeKind)} />
      ) : (
        <FilterPills items={periods} value={range} onChange={(id) => selectRange(id as PnlRangeKind)} />
      )}
      {range === "custom" ? (
        <Card padding={16}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="label">From</AppText>
              <DateField title="From" value={from} onChange={setFrom} placeholder="Start" />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="label">To</AppText>
              <DateField title="To" value={to} onChange={setTo} placeholder="Today" />
            </View>
          </View>
          <Button
            label="Apply"
            style={{ marginTop: 12, alignSelf: "flex-start" }}
            onPress={() => {
              setApplied({ from, to });
              onChange(filterFor("custom", from, to));
            }}
          />
        </Card>
      ) : null}
    </View>
  );
}

/** Website TalentPnlBreakdownList. */
export function BreakdownList({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: { id: string; name: string; fee: number; expenses: number; profit: number }[];
  currency: string;
}) {
  if (rows.length === 0) return null;
  const money = (amount: number) => fmtMoney(amount, currency);
  return (
    <View style={[ui.card, { overflow: "hidden", marginBottom: 16 }]}>
      <View style={styles.listHeader}>
        <AppText variant="title">{title}</AppText>
      </View>
      {rows.map((row, index) => (
        <View
          key={row.id}
          style={[styles.breakdownRow, index < rows.length - 1 && styles.divider]}
        >
          <AppText variant="cardTitle" style={{ flex: 1 }} numberOfLines={1}>
            {row.name}
          </AppText>
          <AppText variant="caption" style={{ fontSize: 11 }}>
            {money(row.fee)} − {money(row.expenses)}
          </AppText>
          <AppText
            variant="caption"
            style={{
              minWidth: 64,
              textAlign: "right",
              fontFamily: fonts.sansSemi,
              color: row.profit >= 0 ? colors.primaryHover : colors.danger,
            }}
          >
            {money(row.profit)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Website PnlCurrencySelect. */
export function CurrencyPicker({
  value,
  currencies,
  onChange,
}: {
  value: string;
  currencies: string[];
  onChange: (value: string) => void;
}) {
  const options = currencies.map((code) => ({ value: code, label: code }));
  const known = options.some((option) => option.value === value)
    ? options
    : [{ value, label: value }, ...options];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <AppText variant="label">Show in</AppText>
      <View style={{ width: 110 }}>
        <SelectField title="P&L currency" value={value} options={known} onChange={onChange} />
      </View>
    </View>
  );
}

export function PaymentsOverdueBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.overdue}>
      <AppText variant="cardTitle" style={{ color: colors.onPrimary }}>
        {count} overdue
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  listHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  overdue: {
    backgroundColor: colors.danger,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});
