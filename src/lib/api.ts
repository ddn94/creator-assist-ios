/**
 * Write actions — client ports of the website's server actions in
 * lib/data/contentActions.ts, paymentActions.ts, ideaActions.ts,
 * talentActions.ts and lib/auth/actions.ts. Same RPCs, same messages.
 */
import {
  contentChangeSummaries,
  invoiceChangeSummaries,
  recordContentChanges,
  type ContentSaveSection,
  type SavedContentSnapshot,
} from "@/lib/contentChanges";
import { currencyForCountry } from "@/lib/countries";
import { moneyCode } from "@/lib/fx";
import type { IdeaStatus } from "@/lib/ideas";
import { DEFAULT_PLATFORM } from "@/lib/platforms";
import {
  asAnswers,
  cleanPlatforms,
  readString,
} from "@/lib/profileAnswers";
import { supabase } from "@/lib/supabase";
import { mergeTimestamp, nowTimestamp, toTimestamp } from "@/lib/timestamps";
import type {
  ContentType,
  PaymentTerms,
  Stage,
  TrackerDeliverable,
  TrackerDetail,
  TrackerExpense,
} from "@/lib/tracker";
import type { Profile } from "@/lib/types";

export type { ContentSaveSection };

const WEBSITE_ORIGIN =
  process.env.EXPO_PUBLIC_WEBSITE_URL ?? "http://localhost:3000";

type Result = { error: string | null };

function failure(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isUuid(id: string) {
  return /^[0-9a-f-]{36}$/i.test(id);
}

function saveFailure(message: string) {
  if (message.includes("Could not save deliverables")) {
    return "Could not save deliverables.";
  }
  if (message.includes("Could not save expenses")) {
    return "Could not save expenses.";
  }
  return "Could not save content.";
}

function keptCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  return code;
}

function expenseCurrencyMap(rows: unknown): Map<string, string> {
  const currencies = new Map<string, string>();
  if (!Array.isArray(rows)) return currencies;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const id = "id" in row && typeof row.id === "string" ? row.id : "";
    const code = "currency" in row ? keptCurrency(row.currency) : null;
    if (id && code) currencies.set(id, code);
  }
  return currencies;
}

/** Currency for money that does not have one yet. Existing rows keep theirs. */
async function currencyForNewMoney(
  profile: Profile,
  recordId: string | null | undefined,
): Promise<string> {
  if (profile.role === "talent") return moneyCode(profile.currency);
  if (recordId) {
    const { data } = await supabase
      .from("talent_records")
      .select("currency")
      .eq("id", recordId)
      .maybeSingle();
    const code = keptCurrency(data?.currency);
    if (code) return code;
  }
  return moneyCode(profile.currency);
}

/** Unclaimed record content, or a deal this agency logged that the talent now owns. */
async function agencyEditableContent(agencyId: string, contentId: string) {
  const { data } = await supabase
    .from("content_items")
    .select("id, owner_id, talent_record_id, agency_created, agency_copy_of")
    .eq("id", contentId)
    .maybeSingle();
  if (!data?.talent_record_id || data.agency_copy_of) return null;
  const { data: record } = await supabase
    .from("talent_records")
    .select("id, agency_id, status")
    .eq("id", data.talent_record_id)
    .maybeSingle();
  if (!record || record.agency_id !== agencyId) return null;
  if (!data.owner_id) return { claimed: false };
  if (data.agency_created && record.status === "active") {
    return { claimed: true };
  }
  return null;
}

async function unclaimedRecordContent(agencyId: string, contentId: string) {
  const editable = await agencyEditableContent(agencyId, contentId);
  return Boolean(editable && !editable.claimed);
}

export type ContentInput = {
  title: string;
  platform: string;
  niche: string | null;
  type: ContentType;
  brandName: string | null;
  goLiveDate: string | null;
  notes?: string;
  ideaTitle?: string | null;
};

export async function addContent(
  profile: Profile,
  payload: ContentInput,
): Promise<{ id: string } | { error: string }> {
  try {
    if (profile.role !== "talent") return { error: "Sign in as a creator." };
    if (!payload.title.trim()) return { error: "Title is required." };
    const isPaid = payload.type === "paid_collab";
    const { data, error } = await supabase
      .from("content_items")
      .insert({
        owner_id: profile.id,
        title: payload.title.trim(),
        platform: payload.platform || DEFAULT_PLATFORM,
        niche: payload.niche,
        type: payload.type,
        brand_name: isPaid ? payload.brandName : null,
        stage: "concept",
        go_live_date: toTimestamp(payload.goLiveDate),
        notes: payload.notes ?? "",
        idea_title: payload.ideaTitle ?? null,
        fee_agreed: isPaid ? 0 : null,
        currency: isPaid ? moneyCode(profile.currency) : null,
        payment_terms: isPaid ? "net_30" : null,
      })
      .select("id")
      .single();
    if (error || !data) return { error: "Could not add content." };
    await recordContentChanges(supabase, profile, data.id, [
      `Added "${payload.title.trim()}"`,
    ]);
    return { id: data.id };
  } catch (error) {
    return { error: failure(error, "Could not add content.") };
  }
}

export async function addContentForRecord(
  profile: Profile,
  recordId: string,
  payload: ContentInput,
): Promise<{ id: string } | { error: string }> {
  try {
    if (profile.role !== "agency") {
      return { error: "Sign in as an agency to add content for talent." };
    }
    if (!payload.title.trim()) return { error: "Title is required." };
    const { data: record } = await supabase
      .from("talent_records")
      .select("id, status, linked_user_id, currency")
      .eq("id", recordId)
      .eq("agency_id", profile.id)
      .maybeSingle();
    if (!record || record.status !== "record" || record.linked_user_id) {
      return {
        error: "You can only add content for someone who hasn't been invited yet.",
      };
    }
    const isPaid = payload.type === "paid_collab";
    const { data, error } = await supabase
      .from("content_items")
      .insert({
        owner_id: null,
        talent_record_id: recordId,
        agency_created: true,
        title: payload.title.trim(),
        platform: payload.platform || DEFAULT_PLATFORM,
        niche: payload.niche,
        type: payload.type,
        brand_name: isPaid ? payload.brandName : null,
        stage: "concept",
        go_live_date: toTimestamp(payload.goLiveDate),
        notes: payload.notes ?? "",
        fee_agreed: isPaid ? 0 : null,
        currency: isPaid ? moneyCode(record.currency) : null,
        payment_terms: isPaid ? "net_30" : null,
      })
      .select("id")
      .single();
    if (error || !data) return { error: "Could not add content." };
    await recordContentChanges(supabase, profile, data.id, [
      `Added "${payload.title.trim()}"`,
    ]);
    return { id: data.id };
  } catch (error) {
    return { error: failure(error, "Could not add content.") };
  }
}

export async function setContentStage(
  profile: Profile,
  id: string,
  stage: Stage,
): Promise<Result> {
  try {
    if (profile.role === "agency" && !(await unclaimedRecordContent(profile.id, id))) {
      return { error: "Could not update stage." };
    }
    let query = supabase.from("content_items").update({ stage }).eq("id", id);
    if (profile.role === "agency") query = query.is("owner_id", null);
    const { error } = await query;
    if (error) return { error: "Could not update stage." };
    return { error: null };
  } catch (error) {
    return { error: failure(error, "Could not update stage.") };
  }
}

export async function deleteContent(profile: Profile, id: string): Promise<Result> {
  try {
    if (profile.role === "talent") {
      const { error } = await supabase.rpc("delete_owned_content", { p_id: id });
      return { error: error ? "Could not delete content." : null };
    }
    if (!(await unclaimedRecordContent(profile.id, id))) {
      return { error: "Could not delete content." };
    }
    await supabase
      .from("ideas")
      .update({ linked_content_id: null, status: "idea" })
      .eq("linked_content_id", id);
    const { error } = await supabase
      .from("content_items")
      .delete()
      .eq("id", id)
      .is("owner_id", null);
    return { error: error ? "Could not delete content." : null };
  } catch (error) {
    return { error: failure(error, "Could not delete content.") };
  }
}

type StoredLine = {
  id?: string;
  type?: string;
  quantity?: number | string;
  rate?: number | string;
  sort_order?: number | string;
  category?: string;
  amount?: number | string;
  note?: string | null;
  expense_date?: string;
  currency?: string | null;
};

type StoredContent = SavedContentSnapshot & {
  platform: string;
  niche: string | null;
  brand_name: string | null;
  stage: string;
  go_live_date: string | null;
  shot_list: string | null;
  idea_title: string | null;
};

function asLines(value: unknown): StoredLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is StoredLine => !!row && typeof row === "object");
}

function moneyAmount(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function lineId(id: string | undefined) {
  return id && isUuid(id) ? id : null;
}

function bySort(rows: StoredLine[]) {
  return rows
    .slice()
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
}

function deliverableRows(rows: TrackerDeliverable[]) {
  return rows.map((row) => ({
    id: lineId(row.id),
    type: row.type,
    quantity: row.quantity,
    rate: row.rate,
  }));
}

function storedDeliverableRows(rows: unknown) {
  return bySort(asLines(rows)).map((row) => ({
    id: lineId(row.id),
    type: row.type ?? "video",
    quantity: Number(row.quantity ?? 1),
    rate: moneyAmount(row.rate),
  }));
}

function expenseRows(
  rows: TrackerExpense[],
  previousExpenses: Map<string, string>,
  dealCurrency: string | null,
  freshCurrency: string,
) {
  return rows.map((row) => ({
    id: lineId(row.id),
    category: row.category,
    amount: row.amount,
    note: row.note,
    expense_date: toTimestamp(row.date) ?? row.date,
    currency:
      keptCurrency(row.currency) ??
      previousExpenses.get(row.id) ??
      dealCurrency ??
      freshCurrency,
  }));
}

function storedExpenseRows(rows: unknown, fallbackCurrency: string | null) {
  return bySort(asLines(rows)).map((row) => ({
    id: lineId(row.id),
    category: row.category ?? "other",
    amount: moneyAmount(row.amount),
    note: row.note ?? null,
    expense_date: row.expense_date ?? "",
    currency: keptCurrency(row.currency) ?? fallbackCurrency,
  }));
}

/**
 * Save one section. Every other field is copied from the row just read,
 * so typing that has not been saved in another section cannot overwrite it.
 */
export async function saveContent(
  profile: Profile,
  item: TrackerDetail,
  section: ContentSaveSection,
): Promise<Result> {
  try {
    if (profile.role === "agency" && !(await agencyEditableContent(profile.id, item.id))) {
      return { error: "Could not save content." };
    }
    const { data, error: readError } = await supabase
      .from("content_items")
      .select(
        "title, platform, niche, type, brand_name, stage, go_live_date, shot_list, notes, idea_title, fee_agreed, currency, payment_terms, date_delivered, date_invoiced, date_paid, content_deliverables (id, type, quantity, rate, sort_order), content_expenses (id, category, amount, note, expense_date, currency, sort_order)",
      )
      .eq("id", item.id)
      .maybeSingle();
    const stored = data as StoredContent | null;
    if (readError || !stored) return { error: "Could not save content." };

    const wasPaid = stored.type === "paid_collab";
    const previousDealCurrency = keptCurrency(stored.currency);
    const previousExpenses = expenseCurrencyMap(stored.content_expenses);
    const requestedDealCurrency = keptCurrency(item.deal?.currency);
    const creatingDeal =
      section === "details" && item.type === "paid_collab" && !wasPaid;
    const needsFreshCurrency =
      (section === "deal" && !requestedDealCurrency && !previousDealCurrency) ||
      (creatingDeal && !requestedDealCurrency && !previousDealCurrency) ||
      (section === "expenses" &&
        item.expenses.some(
          (row) => !keptCurrency(row.currency) && !previousExpenses.get(row.id),
        ));
    const freshCurrency = needsFreshCurrency
      ? await currencyForNewMoney(profile, item.talentRecordId)
      : "USD";
    const keptDealCurrency =
      previousDealCurrency ?? (wasPaid ? freshCurrency : null);

    const payload = {
      p_id: item.id,
      p_title: stored.title,
      p_platform: stored.platform,
      p_niche: stored.niche,
      p_type: stored.type,
      p_brand_name: stored.brand_name,
      p_stage: stored.stage,
      p_go_live_date: stored.go_live_date,
      p_shot_list: stored.shot_list ?? "",
      p_notes: stored.notes ?? "",
      p_idea_title: stored.idea_title,
      p_fee_agreed: wasPaid ? moneyAmount(stored.fee_agreed) : null,
      p_currency: wasPaid ? keptDealCurrency : null,
      p_payment_terms: wasPaid ? (stored.payment_terms ?? "net_30") : null,
      p_date_delivered: wasPaid ? stored.date_delivered : null,
      p_date_invoiced: wasPaid ? stored.date_invoiced : null,
      p_date_paid: wasPaid ? stored.date_paid : null,
      p_deliverables: wasPaid
        ? storedDeliverableRows(stored.content_deliverables)
        : [],
      p_expenses: storedExpenseRows(stored.content_expenses, keptDealCurrency),
    };

    if (section === "details") {
      const paid = item.type === "paid_collab";
      payload.p_title = item.title.trim();
      payload.p_platform = item.platform;
      payload.p_niche = item.niche;
      payload.p_type = item.type;
      payload.p_brand_name = paid ? item.brandName : null;
      payload.p_stage = item.stage;
      payload.p_go_live_date = mergeTimestamp(stored.go_live_date, item.goLiveDate);
      payload.p_shot_list = item.shotList;
      payload.p_notes = item.notes;
      if (!paid) {
        payload.p_fee_agreed = null;
        payload.p_currency = null;
        payload.p_payment_terms = null;
        payload.p_date_delivered = null;
        payload.p_date_invoiced = null;
        payload.p_date_paid = null;
        payload.p_deliverables = [];
      } else if (!wasPaid) {
        payload.p_fee_agreed = 0;
        payload.p_currency =
          requestedDealCurrency ?? previousDealCurrency ?? freshCurrency;
        payload.p_payment_terms = "net_30";
        payload.p_date_delivered = null;
        payload.p_date_invoiced = null;
        payload.p_date_paid = null;
        payload.p_deliverables = [];
      }
    } else if (section === "deal") {
      payload.p_type = "paid_collab";
      payload.p_fee_agreed = moneyAmount(item.deal?.feeAgreed);
      payload.p_currency =
        requestedDealCurrency ?? previousDealCurrency ?? freshCurrency;
      payload.p_payment_terms = item.deal?.paymentTerms ?? "net_30";
      payload.p_date_delivered = mergeTimestamp(
        stored.date_delivered,
        item.deal?.dateDelivered,
      );
      payload.p_date_invoiced = mergeTimestamp(
        stored.date_invoiced,
        item.deal?.dateInvoiced,
      );
      payload.p_date_paid = mergeTimestamp(stored.date_paid, item.deal?.datePaid);
    } else if (section === "deliverables") {
      payload.p_deliverables = deliverableRows(item.deal?.deliverables ?? []);
      if (
        requestedDealCurrency &&
        requestedDealCurrency !== previousDealCurrency
      ) {
        payload.p_currency = requestedDealCurrency;
      }
    } else {
      payload.p_expenses = expenseRows(
        item.expenses,
        previousExpenses,
        keptDealCurrency,
        freshCurrency,
      );
    }

    const { error } = await supabase.rpc("save_content", payload);
    if (error) return { error: saveFailure(error.message) };

    const summaries = contentChangeSummaries(stored, item, section);
    await recordContentChanges(supabase, profile, item.id, summaries);
    return { error: null };
  } catch (error) {
    return { error: failure(error, "Could not save content.") };
  }
}

export async function markContentPaid(
  profile: Profile,
  contentId: string,
): Promise<Result> {
  try {
    if (profile.role !== "talent") return { error: "Sign in as a creator." };
    const paid = nowTimestamp();
    const { data } = await supabase
      .from("content_items")
      .select("id, title")
      .eq("id", contentId)
      .maybeSingle();
    if (!data) return { error: "Content not found." };
    const { error } = await supabase
      .from("content_items")
      .update({ date_paid: paid })
      .eq("id", contentId);
    if (error) return { error: "Could not mark paid." };
    const title = typeof data.title === "string" ? data.title : "this content";
    await recordContentChanges(supabase, profile, contentId, [
      `Marked "${title}" as paid`,
    ]);
    return { error: null };
  } catch (error) {
    return { error: failure(error, "Could not mark paid.") };
  }
}

export async function markContentInvoiced(
  profile: Profile,
  contentId: string,
  terms: PaymentTerms,
): Promise<Result> {
  try {
    if (profile.role !== "talent") return { error: "Sign in as a creator." };
    const invoiced = nowTimestamp();
    const { data } = await supabase
      .from("content_items")
      .select("id, title")
      .eq("id", contentId)
      .maybeSingle();
    if (!data) return { error: "Content not found." };
    const { error } = await supabase
      .from("content_items")
      .update({
        payment_terms: terms,
        date_invoiced: invoiced,
        date_paid: null,
      })
      .eq("id", contentId);
    if (error) return { error: "Could not mark invoiced." };
    const title = typeof data.title === "string" ? data.title : "this content";
    await recordContentChanges(supabase, profile, contentId, [
      `Marked "${title}" as invoiced`,
    ]);
    return { error: null };
  } catch (error) {
    return { error: failure(error, "Could not mark invoiced.") };
  }
}

export type InvoicePatch = {
  dateInvoiced: string;
  paymentTerms: PaymentTerms;
  datePaid: string | null;
};

export async function updateContentInvoice(
  profile: Profile,
  contentId: string,
  payload: InvoicePatch,
): Promise<Result> {
  try {
    const invoicedDay = payload.dateInvoiced.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoicedDay)) {
      return { error: "Enter a valid invoice date." };
    }
    const paidDay = payload.datePaid?.slice(0, 10) || null;
    if (paidDay && !/^\d{4}-\d{2}-\d{2}$/.test(paidDay)) {
      return { error: "Enter a valid paid date." };
    }
    const { data } = await supabase
      .from("content_items")
      .select("title, payment_terms, date_delivered, date_invoiced, date_paid")
      .eq("id", contentId)
      .maybeSingle();
    if (!data) return { error: "Content not found." };

    const invoiced = mergeTimestamp(
      typeof data.date_invoiced === "string" ? data.date_invoiced : null,
      invoicedDay,
    );
    const paid = mergeTimestamp(
      typeof data.date_paid === "string" ? data.date_paid : null,
      paidDay,
    );
    const { error } = await supabase
      .from("content_items")
      .update({
        payment_terms: payload.paymentTerms,
        date_invoiced: invoiced,
        date_delivered: data.date_delivered ?? mergeTimestamp(null, invoicedDay),
        date_paid: paid,
      })
      .eq("id", contentId);
    if (error) return { error: "Could not update invoice." };
    const title = typeof data.title === "string" ? data.title : "";
    await recordContentChanges(
      supabase,
      profile,
      contentId,
      invoiceChangeSummaries(
        title,
        {
          payment_terms:
            typeof data.payment_terms === "string" ? data.payment_terms : null,
          date_invoiced:
            typeof data.date_invoiced === "string" ? data.date_invoiced : null,
          date_paid: typeof data.date_paid === "string" ? data.date_paid : null,
        },
        {
          paymentTerms: payload.paymentTerms,
          dateInvoiced: invoicedDay,
          datePaid: paidDay,
        },
      ),
    );
    return { error: null };
  } catch (error) {
    return { error: failure(error, "Could not update invoice.") };
  }
}

/** Ideas */

export async function addIdea(
  profile: Profile,
  payload: { title: string; body: string; tags: string[]; status: IdeaStatus },
): Promise<{ id: string } | { error: string }> {
  try {
    if (!payload.title.trim()) return { error: "Title is required." };
    const { data, error } = await supabase
      .from("ideas")
      .insert({
        owner_id: profile.id,
        title: payload.title.trim(),
        body: payload.body,
        tags: payload.tags,
        status: payload.status,
      })
      .select("id")
      .single();
    if (error || !data) return { error: "Could not add idea." };
    return { id: data.id };
  } catch (error) {
    return { error: failure(error, "Could not add idea.") };
  }
}

export async function upsertIdea(payload: {
  id: string;
  title: string;
  body: string;
  tags: string[];
  status: IdeaStatus;
  linkedContentItemId?: string | null;
}): Promise<Result> {
  try {
    const { error } = await supabase
      .from("ideas")
      .update({
        title: payload.title.trim(),
        body: payload.body,
        tags: payload.tags,
        status: payload.status,
        linked_content_id: payload.linkedContentItemId ?? null,
      })
      .eq("id", payload.id);
    return { error: error ? "Could not save idea." : null };
  } catch (error) {
    return { error: failure(error, "Could not save idea.") };
  }
}

export async function deleteIdea(id: string): Promise<Result> {
  try {
    const { error } = await supabase.from("ideas").delete().eq("id", id);
    return { error: error ? "Could not delete idea." : null };
  } catch (error) {
    return { error: failure(error, "Could not delete idea.") };
  }
}

export async function turnIdeaIntoContent(
  profile: Profile,
  ideaId: string,
): Promise<{ id: string } | { error: string }> {
  try {
    const { data: idea } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .eq("owner_id", profile.id)
      .maybeSingle();
    if (!idea) return { error: "Idea not found." };
    if (typeof idea.linked_content_id === "string" && idea.linked_content_id) {
      return { id: idea.linked_content_id };
    }
    const created = await addContent(profile, {
      title: idea.title,
      platform: DEFAULT_PLATFORM,
      niche: Array.isArray(idea.tags) && idea.tags[0] ? idea.tags[0] : null,
      type: "organic",
      brandName: null,
      goLiveDate: null,
      notes: idea.body ?? "",
      ideaTitle: idea.title,
    });
    if ("error" in created) return created;

    const { data: linked, error: linkError } = await supabase
      .from("ideas")
      .update({ status: "used", linked_content_id: created.id })
      .eq("id", ideaId)
      .eq("owner_id", profile.id)
      .is("linked_content_id", null)
      .select("id")
      .maybeSingle();

    if (linkError || !linked) {
      await supabase.rpc("delete_owned_content", { p_id: created.id });
      const { data: current } = await supabase
        .from("ideas")
        .select("linked_content_id")
        .eq("id", ideaId)
        .eq("owner_id", profile.id)
        .maybeSingle();
      if (typeof current?.linked_content_id === "string" && current.linked_content_id) {
        return { id: current.linked_content_id };
      }
      return { error: "Could not turn this idea into a post." };
    }
    return { id: created.id };
  } catch (error) {
    return { error: failure(error, "Could not turn this idea into a post.") };
  }
}

/** Roster */

function followersFrom(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

function rosterDuplicateMessage(message: string) {
  const marker = " is already on your roster";
  const at = message.toLowerCase().indexOf(marker);
  const before = at >= 0 ? message.slice(0, at) : "";
  const name = before.split(/[:\n]/).pop()?.trim() || "This person";
  return `${name} is already on your roster. Reconnect that card.`;
}

export async function addTalent(input: {
  status: "record" | "invited";
  name: string;
  email: string;
  platform: string;
  handle: string;
  community: string;
  niche: string;
  notes: string;
}): Promise<{ id: string; message: string } | { error: string }> {
  const name = input.name.trim();
  const email = input.email.trim();
  if (!name) return { error: "Name is required." };
  if (input.status === "invited" && !email) {
    return { error: "Add an email to invite them." };
  }
  const { data, error } = await supabase.rpc("agency_add_talent", {
    p_name: name,
    p_email: email,
    p_status: input.status,
    p_platform: input.platform,
    p_handle: input.handle,
    p_followers: followersFrom(input.community),
    p_niche: input.niche,
    p_notes: input.notes,
  });
  if (error || data == null || data === "") {
    const message = error?.message ?? "";
    const lower = message.toLowerCase();
    if (lower.includes("already on your roster")) {
      return { error: rosterDuplicateMessage(message) };
    }
    if (lower.includes("agency account")) {
      return { error: "This email is an agency account. Use a talent email." };
    }
    if (lower.includes("already connected")) {
      return { error: "This talent is already connected to an agency." };
    }
    if (lower.includes("email")) return { error: "Add an email to invite them." };
    if (lower.includes("only an agency")) {
      return { error: "Only an agency can add talent." };
    }
    return { error: "Could not save this talent. Try again." };
  }
  const id = String(data);
  if (input.status === "invited") {
    const { data: row } = await supabase
      .from("talent_records")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    return {
      id,
      message:
        row?.status === "requested"
          ? "Connection request sent."
          : "Invite code created. Send it to them.",
    };
  }
  return { id, message: `“${name}” was added.` };
}

export async function inviteTalent(
  id: string,
  email: string,
): Promise<{ message: string } | { error: string }> {
  if (!id) return { error: "Missing talent." };
  const { data, error } = await supabase.rpc("agency_invite_talent", {
    p_id: id,
    p_email: email,
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already on your roster")) {
      return { error: rosterDuplicateMessage(error.message) };
    }
    if (message.includes("agency account")) {
      return { error: "This email is an agency account. Use a talent email." };
    }
    if (message.includes("already connected")) {
      return { error: "This talent is already connected to an agency." };
    }
    if (message.includes("email")) return { error: "Add an email to invite them." };
    if (message.includes("already")) {
      return { error: "This talent already has an account." };
    }
    return { error: "Could not invite them. Try again." };
  }
  return {
    message:
      data === "request"
        ? "Connection request sent."
        : "Invite code created. Send it to them.",
  };
}

export async function deleteTalentRecord(
  profile: Profile,
  id: string,
): Promise<Result> {
  if (profile.role !== "agency") {
    return { error: "Only an agency can remove talent." };
  }
  const { error } = await supabase.rpc("agency_delete_record", { p_id: id });
  if (error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("not been invited") ||
      message.includes("only a record") ||
      message.includes("not been joined")
    ) {
      return {
        error:
          "Only a private card, invite, request, or disconnected card can be removed.",
      };
    }
    if (message.includes("only an agency")) {
      return { error: "Only an agency can remove talent." };
    }
    return { error: "Could not remove this talent." };
  }
  return { error: null };
}

export async function disconnectTalentLink(id: string): Promise<Result> {
  const { error } = await supabase.rpc("disconnect_talent_link", { p_id: id });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("only a connected")) {
      return { error: "Only a connected talent can be disconnected." };
    }
    if (message.includes("cannot disconnect")) {
      return { error: "You cannot disconnect this talent." };
    }
    return { error: "Could not disconnect." };
  }
  return { error: null };
}

export async function respondConnectionRequest(
  profile: Profile,
  id: string,
  accept: boolean,
): Promise<Result> {
  if (profile.role !== "talent") {
    return { error: "Sign in as a creator to answer this request." };
  }
  const { error } = await supabase.rpc("respond_connection_request", {
    p_id: id,
    p_accept: accept,
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("disconnect from your current")) {
      return { error: "Disconnect from your current agency first." };
    }
    if (message.includes("not found")) {
      return { error: "That request is no longer waiting." };
    }
    return { error: "Could not answer that request." };
  }
  return { error: null };
}

/** Account */

export async function joinWaitlist(
  raw: string,
): Promise<{ message: string } | { error: string }> {
  const email = raw.trim().toLowerCase();
  if (!email) return { error: "Enter your email." };
  const { error } = await supabase.rpc("join_waitlist", { p_email: email });
  if (error) {
    return {
      error: error.message.toLowerCase().includes("valid email")
        ? "Enter a valid email."
        : "Could not join the waitlist. Try again.",
    };
  }
  return { message: "You’re on the list. We’ll email your invite code." };
}

export async function saveProfileAnswers(
  profile: Profile,
  answers: Record<string, unknown>,
  complete = false,
): Promise<Result> {
  let cleaned: Record<string, unknown>;
  try {
    cleaned = asAnswers(JSON.parse(JSON.stringify(answers)));
  } catch {
    return { error: "Could not save those answers." };
  }
  if (JSON.stringify(cleaned).length > 50_000) {
    return { error: "That profile is too large to save." };
  }
  if ("platforms" in cleaned) {
    cleaned.platforms = cleanPlatforms(cleaned.platforms);
  }

  const name = readString(cleaned, "name").trim();
  const agencyName = readString(cleaned, "agencyName").trim();
  const country = readString(cleaned, "country").trim();

  if (complete) {
    if (profile.role === "agency") {
      if (!agencyName || !name || !country) {
        return { error: "Agency name, your name, and country are required." };
      }
    } else if (!name || !country) {
      return { error: "Name and country are required." };
    }
  }

  const onboarding = { ...profile.onboarding, ...cleaned };
  if (complete && !profile.onboarding_completed_at) {
    onboarding.productTour = "pending";
  }
  const patch: Record<string, unknown> = { onboarding };
  if ("name" in cleaned) patch.display_name = name || profile.display_name;
  if ("agencyName" in cleaned) patch.agency_name = agencyName || null;
  if ("country" in cleaned && country) {
    patch.country = country;
    patch.currency = currencyForCountry(country);
  }
  if (complete) patch.onboarding_completed_at = new Date().toISOString();

  const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
  return { error: error ? "Could not save your profile. Try again." : null };
}

export async function completeProductTour(profile: Profile): Promise<void> {
  const onboarding = { ...profile.onboarding, productTour: "done" };
  await supabase.from("profiles").update({ onboarding }).eq("id", profile.id);
}

export async function changePassword(
  profile: Profile,
  input: { current: string; password: string; confirm: string },
): Promise<Result> {
  if (!input.current) return { error: "Enter your current password." };
  if (input.password.length < 8) return { error: "Use at least 8 characters." };
  if (input.password !== input.confirm) return { error: "Passwords don’t match." };
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: input.current,
  });
  if (signInError) {
    return { error: "That's not your current password. Try again." };
  }
  const { error } = await supabase.auth.updateUser({ password: input.password });
  return { error: error ? "Could not update your password. Try again." : null };
}

export async function updatePassword(password: string, confirm: string): Promise<Result> {
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don’t match." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Open the reset link from your email, then choose a new password.",
    };
  }
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ? error.message : null };
}

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function avatarObjectPath(userId: string) {
  return `${userId}/avatar`;
}

export async function setAvatar(
  userId: string,
  uri: string,
  mime = "image/jpeg",
  size?: number | null,
): Promise<Result> {
  if (!AVATAR_TYPES.includes(mime)) return { error: "Use a JPG, PNG, or WebP." };
  if (size && size > AVATAR_MAX_BYTES) return { error: "Use an image under 2 MB." };
  const path = avatarObjectPath(userId);
  const response = await fetch(uri);
  const body = await response.arrayBuffer();
  if (body.byteLength > AVATAR_MAX_BYTES) return { error: "Use an image under 2 MB." };
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, body, { upsert: true, contentType: mime, cacheControl: "0" });
  if (uploadError) return { error: uploadError.message };
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", userId);
  return { error: error ? "Could not save your photo. Try again." : null };
}

export async function clearAvatar(userId: string): Promise<Result> {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", userId);
  if (error) return { error: "Could not remove your photo. Try again." };
  await supabase.storage.from("avatars").remove([avatarObjectPath(userId)]);
  return { error: null };
}

/** Deletion runs on the website (service role). Bearer token proves who is asking. */
export async function deleteOwnAccount(): Promise<Result> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { error: "Sign in to delete your account." };
  try {
    const response = await fetch(`${WEBSITE_ORIGIN}/api/account/delete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: body.error || "Could not delete your account. Try again." };
    }
  } catch {
    return { error: "Could not delete your account. Try again." };
  }
  await supabase.auth.signOut();
  return { error: null };
}

export type WaitlistEntry = {
  id: string;
  email: string;
  inviteCode: string;
  createdAt: string;
  consumedAt: string | null;
};

export async function listWaitlist(): Promise<{ items: WaitlistEntry[] } | { error: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { error: "Sign in required." };
  try {
    const response = await fetch(`${WEBSITE_ORIGIN}/api/admin/waitlist`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      items?: WaitlistEntry[];
    };
    if (!response.ok) return { error: body.error || "Could not load the waitlist." };
    return { items: body.items ?? [] };
  } catch {
    return { error: "Could not reach the website. Check EXPO_PUBLIC_WEBSITE_URL." };
  }
}
