import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { usePreventRemove } from "expo-router";
import { ActivityFeed } from "@/components/shared";
import { Icon } from "@/components/Icon";
import { DateField, MoneyField, SelectField } from "@/components/pickers";
import { ConfirmModal } from "@/components/Sheet";
import { showToast } from "@/components/Toast";
import {
  AppText,
  BackLink,
  Button,
  Card,
  CategoryCard,
  CategoryPill,
  Field,
  FormAlert,
  IconButton,
  Screen,
  StatusTag,
  TextField,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import {
  deleteContent,
  saveContent,
  updateContentInvoice,
  type ContentSaveSection,
} from "@/lib/api";
import { calendarDay } from "@/lib/calendarDay";
import { colors, fonts } from "@/lib/colors";
import { convertOnDate, moneyCode, EMPTY_RATE_BOOK, type RateBook } from "@/lib/fx";
import type { TalentActivityItem } from "@/lib/talent";
import { toDateInput } from "@/lib/timestamps";
import {
  CONTENT_TYPE_OPTIONS,
  DEAL_STATUS_LABELS,
  DELIVERABLE_TYPE_LABELS,
  DELIVERABLE_TYPE_OPTIONS,
  EXPENSE_CATEGORY_OPTIONS,
  PAYMENT_TERM_OPTIONS,
  STAGE_OPTIONS,
  computeDealStatus,
  computeDueDate,
  contentCategory,
  contentPillLabel,
  dealStatusTone,
  deliverablesTotal,
  fmtMoney,
  formatLiveDate,
  type ContentType,
  type PaymentTerms,
  type Stage,
  type TrackerDeal,
  type TrackerDetail,
  type TrackerDeliverable,
  type TrackerExpense,
} from "@/lib/tracker";

const EMPTY_DEAL: TrackerDeal = {
  feeAgreed: 0,
  paymentTerms: "net_30",
  dateDelivered: null,
  dateInvoiced: null,
  datePaid: null,
  deliverables: [],
};

function unsavedSentence(names: string[]) {
  const label =
    names.length <= 1
      ? names[0] ?? "This section"
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  return `${label} not saved. Leave this page anyway?`;
}

function newLineId() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type DetailsDraft = {
  title: string;
  platform: string;
  niche: string;
  type: ContentType;
  brandName: string;
  stage: Stage;
  goLiveDate: string;
  shotList: string;
  notes: string;
};

type DealDraft = {
  fee: string;
  currency: string;
  paymentTerms: PaymentTerms;
  dateDelivered: string;
  dateInvoiced: string;
  datePaid: string;
};

type DeliverableDraft = {
  type: TrackerDeliverable["type"];
  quantity: string;
  rate: string;
  currency: string;
};

type ExpenseDraft = {
  category: TrackerExpense["category"];
  amount: string;
  note: string;
  date: string;
  currency: string;
};

function detailsFrom(item: TrackerDetail): DetailsDraft {
  return {
    title: item.title,
    platform: item.platform,
    niche: item.niche ?? "",
    type: item.type,
    brandName: item.brandName ?? "",
    stage: item.stage,
    goLiveDate: toDateInput(item.goLiveDate),
    shotList: item.shotList,
    notes: item.notes,
  };
}

function dealFrom(item: TrackerDetail, currency: string): DealDraft {
  const deal = item.deal ?? EMPTY_DEAL;
  return {
    fee: deal.feeAgreed ? String(deal.feeAgreed) : "",
    currency: deal.currency?.trim() || currency,
    paymentTerms: deal.paymentTerms,
    dateDelivered: toDateInput(deal.dateDelivered),
    dateInvoiced: toDateInput(deal.dateInvoiced),
    datePaid: toDateInput(deal.datePaid),
  };
}

function emptyDeliverable(currency: string): DeliverableDraft {
  return { type: "video", quantity: "1", rate: "", currency };
}

function emptyExpense(currency: string): ExpenseDraft {
  return { category: "editor", amount: "", note: "", date: "", currency };
}

export type ContentDetailMode = "talent" | "agency" | "record";

/**
 * Website ContentDetailView.
 * talent: the owner edits everything.
 * agency: linked talent; only invoice dates stay editable.
 * record: a private card, or a deal the agency logged that both sides still edit.
 */
export function ContentDetailEditor({
  initial,
  platformOptions,
  currency,
  rates = EMPTY_RATE_BOOK,
  mode = "talent",
  activity,
  backLabel = "Back",
  onBack,
  onDeleted,
  onSaved,
  onOpenIdeas,
  focusDeal = false,
}: {
  initial: TrackerDetail;
  platformOptions: { value: string; label: string }[];
  currency: string;
  rates?: RateBook;
  mode?: ContentDetailMode;
  activity?: TalentActivityItem[];
  backLabel?: string;
  onBack: () => void;
  onDeleted: () => void;
  /** A save landed; refresh activity. */
  onSaved?: () => void;
  /** Talent only: open the Ideas board. */
  onOpenIdeas?: () => void;
  focusDeal?: boolean;
}) {
  const { profile } = useAuth();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const dealY = useRef<number | null>(null);
  const [item, setItem] = useState(initial);
  const [details, setDetails] = useState(() => detailsFrom(initial));
  const [deal, setDeal] = useState(() => dealFrom(initial, currency));
  const [deliverable, setDeliverable] = useState(() =>
    emptyDeliverable(initial.deal?.currency?.trim() || currency),
  );
  const [expense, setExpense] = useState(() =>
    emptyExpense(initial.deal?.currency?.trim() || currency),
  );
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<
    "post" | { kind: "deliverable" | "expense"; id: string } | null
  >(null);
  const [removePending, setRemovePending] = useState(false);
  const [leave, setLeave] = useState<{ sections: string[]; proceed: () => void } | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const saveEpoch = useRef(0);
  const allowLeave = useRef(false);
  const [leaving, setLeaving] = useState(false);

  const isAgency = mode === "agency";
  const locked = isAgency;
  const canDelete = mode === "talent" || (mode === "record" && !initial.creatorId);
  const draftType = details.type;
  const isPaid = draftType === "paid_collab";
  const visibleDeal = isPaid ? (item.deal ?? EMPTY_DEAL) : null;
  const dealCurrency = visibleDeal?.currency?.trim() || currency;
  const totalExpenses = item.expenses.reduce(
    (sum, row) =>
      sum +
      convertOnDate(row.amount, row.currency?.trim() || dealCurrency, dealCurrency, row.date, rates),
    0,
  );
  const fee = visibleDeal?.feeAgreed ?? 0;
  const dealStatus = visibleDeal ? computeDealStatus(visibleDeal) : null;
  const dueDate = visibleDeal ? computeDueDate(visibleDeal) : null;
  const deliverableSum = visibleDeal ? deliverablesTotal(visibleDeal.deliverables) : 0;
  const editingDeliverable =
    visibleDeal?.deliverables.find((row) => row.id === editingDeliverableId) ?? null;
  const editingExpense = item.expenses.find((row) => row.id === editingExpenseId) ?? null;
  const typeUnsaved = draftType !== item.type;
  const money = (amount: number) => fmtMoney(amount, dealCurrency);

  function unsavedSections() {
    const names: string[] = [];
    if (!locked) {
      const saved = detailsFrom(item);
      const changed =
        details.title !== saved.title ||
        details.platform !== saved.platform ||
        details.niche.trim() !== saved.niche ||
        details.type !== saved.type ||
        details.brandName.trim() !== saved.brandName ||
        details.stage !== saved.stage ||
        details.goLiveDate !== saved.goLiveDate ||
        details.shotList !== saved.shotList ||
        details.notes !== saved.notes;
      if (changed) names.push("Details");
    }
    if (visibleDeal) {
      const saved = dealFrom(item, currency);
      const feeValue = Number(deal.fee || 0);
      const changed =
        !Number.isFinite(feeValue) ||
        feeValue !== (item.deal?.feeAgreed ?? 0) ||
        deal.paymentTerms !== saved.paymentTerms ||
        deal.dateDelivered !== saved.dateDelivered ||
        deal.dateInvoiced !== saved.dateInvoiced ||
        deal.datePaid !== saved.datePaid ||
        deal.currency !== saved.currency;
      if (changed) names.push("Deal");
    }
    if (!locked && visibleDeal) {
      const savedCurrency = item.deal?.currency?.trim() || currency;
      const changed = editingDeliverable
        ? deliverable.type !== editingDeliverable.type ||
          Number(deliverable.quantity || 1) !== editingDeliverable.quantity ||
          Number(deliverable.rate || 0) !== editingDeliverable.rate ||
          deliverable.currency !== savedCurrency
        : deliverable.type !== "video" ||
          deliverable.quantity !== "1" ||
          deliverable.rate.trim() !== "" ||
          deliverable.currency !== savedCurrency;
      if (changed) names.push("Deliverables");
    }
    if (!locked) {
      const savedCurrency = item.deal?.currency?.trim() || currency;
      const changed = editingExpense
        ? expense.category !== editingExpense.category ||
          Number(expense.amount || 0) !== editingExpense.amount ||
          expense.note.trim() !== (editingExpense.note ?? "").trim() ||
          expense.date !== toDateInput(editingExpense.date) ||
          expense.currency !== (editingExpense.currency?.trim() || savedCurrency)
        : expense.category !== "editor" ||
          expense.amount.trim() !== "" ||
          expense.note.trim() !== "" ||
          expense.date !== "" ||
          expense.currency !== savedCurrency;
      if (changed) names.push("Expenses");
    }
    return names;
  }

  // Swipe-back and the tab bar go through navigation; ask before dropping edits.
  const disablePrevention = usePreventRemove(
    !leaving && unsavedSections().length > 0,
    ({ repeat }) => {
      setLeave({
        sections: unsavedSections(),
        proceed: () => {
          allowLeave.current = true;
          setLeaving(true);
          repeat();
        },
      });
    },
  );

  function release() {
    allowLeave.current = true;
    setLeaving(true);
    disablePrevention();
  }

  useEffect(() => {
    if (!focusDeal) return;
    const timer = setTimeout(() => {
      if (dealY.current != null) {
        scrollRef.current?.scrollTo({ y: Math.max(0, dealY.current - 16), animated: true });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [focusDeal]);

  function goBack() {
    const sections = unsavedSections();
    if (sections.length === 0 || allowLeave.current) {
      release();
      onBack();
      return;
    }
    setLeave({
      sections,
      proceed: () => {
        release();
        onBack();
      },
    });
  }

  function blockUntilTypeSaved() {
    if (!typeUnsaved) return false;
    showToast("Save the type first.", "danger");
    return true;
  }

  function enqueueSave(
    epoch: number,
    work: () => Promise<{ error: string | null }>,
    onError: (message: string) => void,
  ) {
    saveQueue.current = saveQueue.current.then(async () => {
      let message: string | null = null;
      try {
        message = (await work()).error;
      } catch (error) {
        message = error instanceof Error ? error.message : "Could not save content.";
      }
      if (message) {
        if (saveEpoch.current === epoch) onError(message);
        showToast(message, "danger");
        return;
      }
      onSaved?.();
    });
  }

  function commit(
    next: TrackerDetail,
    notice: { message: string; tone?: "success" | "danger" },
    action: "details" | "deal" | "deliverable" | "expense" | "remove",
    section: ContentSaveSection,
  ): boolean {
    if (!profile || isAgency) return false;
    if (section !== "details" && blockUntilTypeSaved()) return false;
    const previous = item;
    const epoch = ++saveEpoch.current;
    setSaveError(null);
    setItem(next);
    setDetails((current) => ({ ...current, type: next.type }));
    if (action === "deal" || action === "deliverable") {
      setDeal(dealFrom(next, currency));
    }
    showToast(notice.message, notice.tone ?? "success");
    enqueueSave(
      epoch,
      () => saveContent(profile, next, section),
      (message) => {
        setItem(previous);
        if (action === "details") setDetails(detailsFrom(previous));
        if (action === "deal") setDeal(dealFrom(previous, currency));
        setSaveError(message);
      },
    );
    return true;
  }

  function saveDetails() {
    if (locked || !details.title.trim()) return;
    const type = details.type;
    commit(
      {
        ...item,
        title: details.title,
        platform: details.platform,
        niche: details.niche.trim() || null,
        type,
        brandName: type === "paid_collab" ? details.brandName.trim() || null : null,
        stage: details.stage,
        goLiveDate: details.goLiveDate || null,
        shotList: details.shotList,
        notes: details.notes,
        deal:
          type === "paid_collab"
            ? item.deal ?? { ...EMPTY_DEAL, currency }
            : null,
      },
      { message: "Details have been saved." },
      "details",
      "details",
    );
  }

  function saveDeal() {
    if (blockUntilTypeSaved()) return;
    const base = item.deal ?? (draftType === "paid_collab" ? EMPTY_DEAL : null);
    if (!base || !profile) return;
    const dateInvoiced = deal.dateInvoiced || null;
    const datePaid = deal.datePaid || null;

    if (isAgency) {
      if (!item.deal) return;
      if (!dateInvoiced) {
        setInvoiceError("Enter a valid invoice date.");
        return;
      }
      const previous = item;
      const epoch = ++saveEpoch.current;
      setInvoiceError(null);
      setItem({
        ...item,
        deal: {
          ...item.deal,
          dateInvoiced,
          datePaid,
          dateDelivered: item.deal.dateDelivered ?? dateInvoiced,
        },
      });
      showToast("Deal saved.");
      enqueueSave(
        epoch,
        () =>
          updateContentInvoice(profile, item.id, {
            dateInvoiced,
            paymentTerms: item.deal!.paymentTerms,
            datePaid,
          }),
        (message) => {
          setItem(previous);
          setDeal(dealFrom(previous, currency));
          setInvoiceError(message);
        },
      );
      return;
    }

    commit(
      {
        ...item,
        type: "paid_collab",
        deal: {
          ...base,
          feeAgreed: Number(deal.fee || 0),
          currency: moneyCode(deal.currency, base.currency?.trim() || currency),
          paymentTerms: deal.paymentTerms,
          dateDelivered: deal.dateDelivered || null,
          dateInvoiced,
          datePaid,
        },
      },
      { message: "Deal saved." },
      "deal",
      "deal",
    );
  }

  function submitDeliverable() {
    if (locked || !visibleDeal || blockUntilTypeSaved()) return;
    const quantity = Number(deliverable.quantity || 1);
    const rate = Number(deliverable.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      showToast("Enter a rate above zero.", "danger");
      return;
    }
    const nextRow: TrackerDeliverable = {
      id: editingDeliverable?.id ?? newLineId(),
      type: deliverable.type,
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
      rate,
    };
    const picked = moneyCode(deliverable.currency, dealCurrency);
    const saved = commit(
      {
        ...item,
        type: "paid_collab",
        deal: {
          ...visibleDeal,
          ...(picked !== dealCurrency ? { currency: picked } : {}),
          deliverables: editingDeliverable
            ? visibleDeal.deliverables.map((row) =>
                row.id === editingDeliverable.id ? nextRow : row,
              )
            : [...visibleDeal.deliverables, nextRow],
        },
      },
      { message: editingDeliverable ? "Deliverable updated." : "Deliverable added." },
      "deliverable",
      "deliverables",
    );
    if (!saved) return;
    setEditingDeliverableId(null);
    setDeliverable(emptyDeliverable(picked));
  }

  function submitExpense() {
    if (locked || blockUntilTypeSaved()) return;
    const amount = Number(expense.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Enter an amount above zero.", "danger");
      return;
    }
    const nextRow: TrackerExpense = {
      id: editingExpense?.id ?? newLineId(),
      category: expense.category,
      amount,
      note: expense.note.trim() || null,
      date: expense.date || calendarDay(new Date()),
      currency: expense.currency,
    };
    const saved = commit(
      {
        ...item,
        expenses: editingExpense
          ? item.expenses.map((row) => (row.id === editingExpense.id ? nextRow : row))
          : [nextRow, ...item.expenses],
      },
      { message: editingExpense ? "Expense updated." : "Expense added." },
      "expense",
      "expenses",
    );
    if (!saved) return;
    setEditingExpenseId(null);
    setExpense(emptyExpense(dealCurrency));
  }

  function beginEditDeliverable(row: TrackerDeliverable) {
    if (blockUntilTypeSaved()) return;
    setSaveError(null);
    setEditingDeliverableId(row.id);
    setDeliverable({
      type: row.type,
      quantity: String(row.quantity),
      rate: String(row.rate),
      currency: dealCurrency,
    });
  }

  function beginEditExpense(row: TrackerExpense) {
    if (blockUntilTypeSaved()) return;
    setSaveError(null);
    setEditingExpenseId(row.id);
    setExpense({
      category: row.category,
      amount: String(row.amount),
      note: row.note ?? "",
      date: toDateInput(row.date),
      currency: row.currency?.trim() || dealCurrency,
    });
  }

  async function confirmRemove() {
    if (!removeTarget || removePending || !profile) return;
    if (blockUntilTypeSaved()) {
      setRemoveTarget(null);
      return;
    }
    if (removeTarget === "post") {
      if (!canDelete) return;
      setRemovePending(true);
      setSaveError(null);
      const result = await deleteContent(profile, item.id);
      setRemovePending(false);
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      setRemoveTarget(null);
      showToast("Content deleted.", "danger");
      release();
      onDeleted();
      return;
    }
    const { kind, id } = removeTarget;
    let removed = false;
    if (kind === "deliverable" && item.deal) {
      if (editingDeliverableId === id) {
        setEditingDeliverableId(null);
        setDeliverable(emptyDeliverable(dealCurrency));
      }
      removed = commit(
        {
          ...item,
          deal: {
            ...item.deal,
            deliverables: item.deal.deliverables.filter((row) => row.id !== id),
          },
        },
        { message: "Deliverable removed.", tone: "danger" },
        "remove",
        "deliverables",
      );
    } else if (kind === "expense") {
      if (editingExpenseId === id) {
        setEditingExpenseId(null);
        setExpense(emptyExpense(dealCurrency));
      }
      removed = commit(
        { ...item, expenses: item.expenses.filter((row) => row.id !== id) },
        { message: "Expense removed.", tone: "danger" },
        "remove",
        "expenses",
      );
    }
    if (removed) setRemoveTarget(null);
  }

  return (
    <Screen ref={scrollRef}>
      <View style={styles.topRow}>
        <BackLink label={backLabel} onPress={goBack} />
        {canDelete ? (
          <IconButton
            icon="trash"
            label="Delete content item"
            color={colors.danger}
            filled
            disabled={removePending}
            onPress={() => {
              if (blockUntilTypeSaved()) return;
              setSaveError(null);
              setRemoveTarget("post");
            }}
          />
        ) : null}
      </View>

      <View style={{ marginBottom: 20 }}>
        <CategoryPill category={contentCategory(draftType)} label={contentPillLabel(draftType)} />
        <AppText variant="heading" style={{ marginTop: 10 }}>
          {item.title}
        </AppText>
        {saveError ? (
          <View style={{ marginTop: 12 }}>
            <FormAlert error={saveError} />
          </View>
        ) : null}
      </View>

      <Card style={styles.section}>
        <AppText variant="title" style={styles.sectionTitle}>
          Details
        </AppText>
        <View style={styles.form}>
          <Field label="Title">
            <TextField
              value={details.title}
              editable={!locked}
              onChangeText={(title) => setDetails({ ...details, title })}
            />
          </Field>
          <View style={styles.row}>
            <Field label="Platform" style={styles.flex}>
              <SelectField
                title="Platform"
                value={details.platform}
                options={platformOptions}
                disabled={locked}
                onChange={(platform) => setDetails({ ...details, platform })}
              />
            </Field>
            <Field label="Type" style={styles.flex}>
              <SelectField
                title="Type"
                value={details.type}
                options={[...CONTENT_TYPE_OPTIONS]}
                disabled={locked}
                onChange={(type) =>
                  setDetails({ ...details, type: type === "paid_collab" ? "paid_collab" : "organic" })
                }
              />
            </Field>
          </View>
          <View style={styles.row}>
            <Field label="Niche / tag" style={styles.flex}>
              <TextField
                value={details.niche}
                editable={!locked}
                onChangeText={(niche) => setDetails({ ...details, niche })}
              />
            </Field>
            <Field label="Brand" style={styles.flex}>
              <TextField
                value={details.brandName}
                editable={!locked}
                autoCapitalize="words"
                onChangeText={(brandName) => setDetails({ ...details, brandName })}
              />
            </Field>
          </View>
          <View style={styles.row}>
            <Field label="Stage" style={styles.flex}>
              <SelectField
                title="Stage"
                value={details.stage}
                options={[...STAGE_OPTIONS]}
                disabled={locked}
                onChange={(stage) => setDetails({ ...details, stage: stage as Stage })}
              />
            </Field>
            <Field label="Go-live date" style={styles.flex}>
              <DateField
                title="Go-live date"
                value={details.goLiveDate}
                disabled={locked}
                onChange={(goLiveDate) => setDetails({ ...details, goLiveDate })}
              />
            </Field>
          </View>
          <Field label="Shot list">
            <TextField
              value={details.shotList}
              editable={!locked}
              multiline
              placeholder="Shots, angles, references — plan it while it's in Concept"
              onChangeText={(shotList) => setDetails({ ...details, shotList })}
            />
          </Field>
          <Field label="Notes">
            <TextField
              value={details.notes}
              editable={!locked}
              multiline
              onChangeText={(notes) => setDetails({ ...details, notes })}
            />
          </Field>
          {!locked ? (
            <Button
              label="Save"
              style={{ alignSelf: "flex-start", height: 40 }}
              disabled={removePending || !details.title.trim()}
              onPress={saveDetails}
            />
          ) : null}
        </View>
      </Card>

      {visibleDeal ? (
        <View
          onLayout={(event) => {
            dealY.current = event.nativeEvent.layout.y;
          }}
        >
          <CategoryCard category="payment" style={[styles.section, { padding: 20 }]}>
            <View style={styles.dealHeader}>
              <AppText variant="title" style={{ fontSize: 17 }}>
                Deal
              </AppText>
              {dealStatus ? (
                <StatusTag label={DEAL_STATUS_LABELS[dealStatus]} tone={dealStatusTone[dealStatus]} />
              ) : null}
            </View>
            <View style={styles.form}>
              <Field label="Fee agreed">
                <MoneyField
                  value={deal.fee}
                  onChangeText={(value) => setDeal({ ...deal, fee: value })}
                  currency={deal.currency}
                  onCurrencyChange={(code) => setDeal({ ...deal, currency: code })}
                  disabled={locked}
                />
              </Field>
              <View style={styles.row}>
                <Field label="Payment terms" style={styles.flex}>
                  <SelectField
                    title="Payment terms"
                    value={deal.paymentTerms}
                    options={[...PAYMENT_TERM_OPTIONS]}
                    disabled={locked}
                    onChange={(value) => setDeal({ ...deal, paymentTerms: value as PaymentTerms })}
                  />
                </Field>
                <Field label="Date delivered" style={styles.flex}>
                  <DateField
                    title="Date delivered"
                    value={deal.dateDelivered}
                    disabled={locked}
                    onChange={(value) => setDeal({ ...deal, dateDelivered: value })}
                  />
                </Field>
              </View>
              <View style={styles.row}>
                <Field label="Date invoiced" style={styles.flex}>
                  <DateField
                    title="Date invoiced"
                    value={deal.dateInvoiced}
                    onChange={(value) => setDeal({ ...deal, dateInvoiced: value })}
                  />
                </Field>
                <Field label="Date paid" style={styles.flex}>
                  <DateField
                    title="Date paid"
                    value={deal.datePaid}
                    onChange={(value) => setDeal({ ...deal, datePaid: value })}
                  />
                </Field>
              </View>
              <View style={styles.dealFooter}>
                <Button label="Save deal" style={{ height: 40 }} disabled={removePending} onPress={saveDeal} />
                <AppText variant="caption" style={{ fontSize: 14 }}>
                  Due date:{" "}
                  <AppText variant="caption" style={{ fontSize: 14, fontFamily: fonts.sansSemi, color: colors.ink }}>
                    {dueDate ? formatLiveDate(dueDate) : "—"}
                  </AppText>
                </AppText>
              </View>
              {invoiceError ? (
                <AppText variant="caption" style={{ color: colors.danger }}>
                  {invoiceError}
                </AppText>
              ) : null}
            </View>

            <View style={styles.subSection}>
              <AppText variant="cardTitle" style={{ marginBottom: 8 }}>
                Deliverables
              </AppText>
              {visibleDeal.deliverables.map((row) => (
                <LineRow
                  key={row.id}
                  title={DELIVERABLE_TYPE_LABELS[row.type]}
                  detail={`${row.quantity} × ${money(row.rate)}`}
                  amount={money(row.quantity * row.rate)}
                  editing={editingDeliverableId === row.id}
                  onEdit={locked ? undefined : () => beginEditDeliverable(row)}
                  onRemove={
                    locked
                      ? undefined
                      : () => {
                          if (blockUntilTypeSaved()) return;
                          setSaveError(null);
                          setRemoveTarget({ kind: "deliverable", id: row.id });
                        }
                  }
                />
              ))}
              {visibleDeal.deliverables.length === 0 ? (
                <AppText variant="caption" style={{ marginBottom: 8 }}>
                  No deliverables yet.
                </AppText>
              ) : (
                <View style={styles.totalRow}>
                  <AppText variant="caption">Deliverables total</AppText>
                  <AppText variant="caption" style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>
                    {money(deliverableSum)}
                  </AppText>
                </View>
              )}
              {visibleDeal.deliverables.length > 0 && deliverableSum !== visibleDeal.feeAgreed ? (
                <View style={styles.warning}>
                  <AppText variant="caption" style={{ color: colors.ink, fontSize: 11 }}>
                    Deliverables total ({money(deliverableSum)}) differs from the agreed fee (
                    {money(visibleDeal.feeAgreed)}). P&L uses the agreed fee.
                  </AppText>
                </View>
              ) : null}
              {!locked ? (
                <View style={[styles.form, { marginTop: 4 }]}>
                  <View style={styles.row}>
                    <Field label="Type" style={styles.flex}>
                      <SelectField
                        title="Deliverable type"
                        value={deliverable.type}
                        options={[...DELIVERABLE_TYPE_OPTIONS]}
                        onChange={(value) =>
                          setDeliverable({ ...deliverable, type: value as TrackerDeliverable["type"] })
                        }
                      />
                    </Field>
                    <Field label="Volume" style={{ width: 90 }}>
                      <TextField
                        value={deliverable.quantity}
                        keyboardType="number-pad"
                        onChangeText={(quantity) => setDeliverable({ ...deliverable, quantity })}
                      />
                    </Field>
                  </View>
                  <Field label="Rate">
                    <MoneyField
                      value={deliverable.rate}
                      onChangeText={(rate) => setDeliverable({ ...deliverable, rate })}
                      currency={deliverable.currency}
                      onCurrencyChange={(code) => setDeliverable({ ...deliverable, currency: code })}
                    />
                  </Field>
                  <View style={styles.row}>
                    {editingDeliverable ? (
                      <Button
                        label="Cancel"
                        variant="secondary"
                        style={styles.flex}
                        onPress={() => {
                          setEditingDeliverableId(null);
                          setDeliverable(emptyDeliverable(dealCurrency));
                        }}
                      />
                    ) : null}
                    <Button
                      label={editingDeliverable ? "Update" : "Add deliverable"}
                      variant="secondary"
                      style={styles.flex}
                      disabled={removePending}
                      onPress={submitDeliverable}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </CategoryCard>
        </View>
      ) : null}

      <Card style={styles.section}>
        <AppText variant="title" style={styles.sectionTitle}>
          Expenses{" "}
          <AppText variant="description" style={{ fontSize: 14 }}>
            (total {money(totalExpenses)})
          </AppText>
        </AppText>
        {item.expenses.map((row) => (
          <LineRow
            key={row.id}
            title={row.category.charAt(0).toUpperCase() + row.category.slice(1)}
            detail={[formatLiveDate(row.date), row.note].filter(Boolean).join(" · ")}
            amount={fmtMoney(row.amount, row.currency?.trim() || dealCurrency)}
            editing={editingExpenseId === row.id}
            onEdit={locked ? undefined : () => beginEditExpense(row)}
            onRemove={
              locked
                ? undefined
                : () => {
                    if (blockUntilTypeSaved()) return;
                    setSaveError(null);
                    setRemoveTarget({ kind: "expense", id: row.id });
                  }
            }
          />
        ))}
        {item.expenses.length === 0 ? (
          <AppText variant="caption" style={{ marginBottom: 8 }}>
            No expenses yet.
          </AppText>
        ) : null}
        {!locked ? (
          <View style={[styles.form, { marginTop: 8 }]}>
            <View style={styles.row}>
              <Field label="Category" style={styles.flex}>
                <SelectField
                  title="Category"
                  value={expense.category}
                  options={[...EXPENSE_CATEGORY_OPTIONS]}
                  onChange={(value) =>
                    setExpense({ ...expense, category: value as TrackerExpense["category"] })
                  }
                />
              </Field>
              <Field label="Date" style={styles.flex}>
                <DateField
                  title="Expense date"
                  value={expense.date}
                  onChange={(date) => setExpense({ ...expense, date })}
                />
              </Field>
            </View>
            <Field label="Amount">
              <MoneyField
                value={expense.amount}
                onChangeText={(amount) => setExpense({ ...expense, amount })}
                currency={expense.currency}
                onCurrencyChange={(code) => setExpense({ ...expense, currency: code })}
              />
            </Field>
            <Field label="Note">
              <TextField value={expense.note} onChangeText={(note) => setExpense({ ...expense, note })} />
            </Field>
            <View style={styles.row}>
              {editingExpense ? (
                <Button
                  label="Cancel"
                  variant="secondary"
                  style={styles.flex}
                  onPress={() => {
                    setEditingExpenseId(null);
                    setExpense(emptyExpense(dealCurrency));
                  }}
                />
              ) : null}
              <Button
                label={editingExpense ? "Update" : "Add expense"}
                variant="secondary"
                style={styles.flex}
                disabled={removePending}
                onPress={submitExpense}
              />
            </View>
          </View>
        ) : null}
      </Card>

      {isPaid && item.deal ? (
        <Card style={styles.section}>
          <AppText variant="title" style={{ marginBottom: 6 }}>
            Profit on this collab
          </AppText>
          <AppText variant="description">
            Fee {money(fee)} − Expenses {money(totalExpenses)} ={" "}
            <AppText
              variant="title"
              style={{ color: fee - totalExpenses >= 0 ? colors.primaryHover : colors.danger }}
            >
              {money(fee - totalExpenses)}
            </AppText>
          </AppText>
        </Card>
      ) : null}

      {item.ideaTitle ? (
        <Card style={styles.section}>
          <AppText variant="title" style={{ marginBottom: 6 }}>
            Created from idea
          </AppText>
          <AppText variant="description">💡 {item.ideaTitle}</AppText>
          {locked || !onOpenIdeas ? (
            <AppText variant="caption" style={{ fontSize: 14, fontFamily: fonts.sansMedium, marginTop: 4 }}>
              (view in brain dump)
            </AppText>
          ) : (
            <Button
              variant="link"
              label="(view in brain dump)"
              style={{ marginTop: 6 }}
              onPress={() => {
                const sections = unsavedSections();
                if (sections.length === 0) {
                  release();
                  onOpenIdeas();
                  return;
                }
                setLeave({
                  sections,
                  proceed: () => {
                    release();
                    onOpenIdeas();
                  },
                });
              }}
            />
          )}
        </Card>
      ) : null}

      {activity ? <ActivityFeed items={activity} /> : null}

      <ConfirmModal
        open={leave !== null}
        title="Leave before saving?"
        question={unsavedSentence(leave?.sections ?? [])}
        confirmLabel="Leave"
        cancelLabel="Stay"
        onClose={() => setLeave(null)}
        onConfirm={() => {
          const proceed = leave?.proceed;
          setLeave(null);
          proceed?.();
        }}
      />
      <ConfirmModal
        open={removeTarget !== null}
        title={
          removeTarget === "post"
            ? "Delete this post"
            : removeTarget?.kind === "deliverable"
              ? "Remove this deliverable"
              : "Remove this expense"
        }
        question={
          removeTarget === "post"
            ? `Are you sure you want to delete “${item.title}”?`
            : removeTarget?.kind === "deliverable"
              ? "Are you sure you want to remove this deliverable?"
              : "Are you sure you want to remove this expense?"
        }
        confirmLabel={removeTarget === "post" ? "Delete" : "Remove"}
        pendingLabel={removeTarget === "post" ? "Deleting…" : "Removing…"}
        pending={removePending}
        error={removeTarget === "post" ? saveError : null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void confirmRemove()}
      />
    </Screen>
  );
}

function LineRow({
  title,
  detail,
  amount,
  editing,
  onEdit,
  onRemove,
}: {
  title: string;
  detail: string;
  amount: string;
  editing: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  return (
    <View style={[styles.line, editing && { backgroundColor: colors.idea }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="cardTitle" numberOfLines={1}>
          {title}
        </AppText>
        {detail ? (
          <AppText variant="caption" style={{ marginTop: 2 }} numberOfLines={2}>
            {detail}
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" style={{ fontFamily: fonts.sansMedium, color: colors.ink }}>
        {amount}
      </AppText>
      {onEdit ? (
        <Pressable accessibilityLabel={`Edit ${title}`} hitSlop={8} onPress={onEdit} style={styles.lineAction}>
          <Icon name="pencil" size={14} color={colors.muted} weight="regular" />
        </Pressable>
      ) : null}
      {onRemove ? (
        <Pressable accessibilityLabel={`Delete ${title}`} hitSlop={8} onPress={onRemove} style={styles.lineAction}>
          <Icon name="trash" size={14} color={colors.muted} weight="regular" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    minHeight: 40,
  },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, marginBottom: 12 },
  form: { gap: 12 },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  dealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dealFooter: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  subSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 4,
  },
  warning: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(246,203,119,0.4)",
    backgroundColor: colors.idea,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lineAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
