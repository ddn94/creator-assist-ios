/**
 * Read queries — same shape as the website's lib/data/*Queries.ts,
 * lib/data/talentRecords.ts and lib/data/linkedTalent.ts.
 */
import {
  CONTENT_SELECT,
  mapContent,
  mapIdea,
  type ContentRow,
  type IdeaRow,
} from "@/lib/map";
import type { IdeaItem } from "@/lib/ideas";
import { asProfile } from "@/lib/profile";
import { asAnswers, readPlatforms, readString } from "@/lib/profileAnswers";
import { supabase } from "@/lib/supabase";
import type { TalentStatus } from "@/lib/talent";
import type { TrackerDetail } from "@/lib/tracker";
import type {
  AgencyLink,
  ConnectionRequest,
  LinkedTalentMeta,
  Profile,
  TalentRecord,
} from "@/lib/types";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return asProfile(data as Record<string, unknown>);
}

export async function listMyContent(ownerId: string): Promise<TrackerDetail[]> {
  const { data } = await supabase
    .from("content_items")
    .select(CONTENT_SELECT)
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((row) => mapContent(row as ContentRow));
}

export async function getContentById(id: string): Promise<TrackerDetail | null> {
  const { data } = await supabase
    .from("content_items")
    .select(CONTENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return mapContent(data as ContentRow);
}

/** Agency snapshot taken when this deal was disconnected from the record. */
export async function getAgencyCopyId(
  contentId: string,
  recordId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("content_items")
    .select("id")
    .eq("agency_copy_of", contentId)
    .eq("talent_record_id", recordId)
    .maybeSingle();
  if (error || typeof data?.id !== "string") return null;
  return data.id;
}

export async function listMyIdeas(ownerId: string): Promise<IdeaItem[]> {
  const { data } = await supabase
    .from("ideas")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => mapIdea(row as IdeaRow));
}

function asStatus(value: unknown): TalentStatus {
  return value === "active" ||
    value === "invited" ||
    value === "disconnected" ||
    value === "requested"
    ? value
    : "record";
}

function asRecord(row: Record<string, unknown>): TalentRecord {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    name: String(row.name),
    email: typeof row.email === "string" ? row.email : null,
    status: asStatus(row.status),
    invite_code: typeof row.invite_code === "string" ? row.invite_code : null,
    linked_user_id:
      typeof row.linked_user_id === "string" ? row.linked_user_id : null,
    disconnected_at:
      typeof row.disconnected_at === "string" ? row.disconnected_at : null,
    declined_at: typeof row.declined_at === "string" ? row.declined_at : null,
    platform: typeof row.platform === "string" ? row.platform : null,
    handle: typeof row.handle === "string" ? row.handle : null,
    followers: typeof row.followers === "number" ? row.followers : null,
    niche: typeof row.niche === "string" ? row.niche : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    location: typeof row.location === "string" ? row.location : null,
    currency: typeof row.currency === "string" ? row.currency : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listTalentRecords(): Promise<TalentRecord[]> {
  const { data } = await supabase
    .from("talent_records")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => asRecord(row as Record<string, unknown>));
}

export async function getTalentRecord(id: string): Promise<TalentRecord | null> {
  const { data } = await supabase
    .from("talent_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return asRecord(data as Record<string, unknown>);
}

/** The agency this talent joined, if any. */
export async function getMyAgencyLink(userId: string): Promise<AgencyLink | null> {
  const { data: rows } = await supabase
    .from("talent_records")
    .select("id, agency_id, status, updated_at")
    .eq("linked_user_id", userId)
    .in("status", ["active", "disconnected"])
    .order("updated_at", { ascending: false });
  const records = rows ?? [];
  const record =
    records.find((row) => row.status === "active") ?? records[0] ?? null;
  if (!record || typeof record.id !== "string" || typeof record.agency_id !== "string") {
    return null;
  }
  const { data: agency } = await supabase
    .from("profiles")
    .select("agency_name, display_name")
    .eq("id", record.agency_id)
    .maybeSingle();
  const agencyName =
    (typeof agency?.agency_name === "string" && agency.agency_name.trim()) ||
    (typeof agency?.display_name === "string" && agency.display_name.trim()) ||
    "your agency";
  return {
    recordId: record.id,
    agencyName,
    status: record.status === "disconnected" ? "disconnected" : "active",
  };
}

/** Requests waiting for this talent to accept. */
export async function getMyConnectionRequests(
  userId: string,
): Promise<ConnectionRequest[]> {
  const { data: rows } = await supabase
    .from("talent_records")
    .select("id, agency_id")
    .eq("status", "requested")
    .or(`request_user_id.eq.${userId},linked_user_id.eq.${userId}`);
  const requests = (rows ?? []).flatMap((row) => {
    if (typeof row.id !== "string" || typeof row.agency_id !== "string") return [];
    return [{ id: row.id, agencyId: row.agency_id }];
  });
  if (requests.length === 0) return [];
  const { data: agencies } = await supabase
    .from("profiles")
    .select("id, agency_name, display_name")
    .in(
      "id",
      requests.map((row) => row.agencyId),
    );
  const names = new Map(
    (agencies ?? []).map((row) => [
      String(row.id),
      (typeof row.agency_name === "string" && row.agency_name.trim()) ||
        (typeof row.display_name === "string" && row.display_name.trim()) ||
        "An agency",
    ]),
  );
  return requests.map((row) => ({
    recordId: row.id,
    agencyName: names.get(row.agencyId) ?? "An agency",
  }));
}

/**
 * Maps talent_records.id -> linked account photo, presence, and live profile
 * fields for every talent of this agency who has joined Creator Assist.
 */
export async function getLinkedTalentAvatars(
  agencyId: string,
): Promise<Map<string, LinkedTalentMeta>> {
  const { data: records } = await supabase
    .from("talent_records")
    .select("id, linked_user_id")
    .eq("agency_id", agencyId)
    .not("linked_user_id", "is", null);

  const linked = (records ?? []).filter(
    (row): row is typeof row & { linked_user_id: string } =>
      typeof row.linked_user_id === "string",
  );
  if (linked.length === 0) return new Map();

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, avatar_path, updated_at, last_seen_at, display_name, country, currency, onboarding",
    )
    .in(
      "id",
      linked.map((row) => row.linked_user_id),
    );

  const byUserId = new Map(
    (profiles ?? []).map((row) => [
      String(row.id),
      {
        avatarPath: typeof row.avatar_path === "string" ? row.avatar_path : null,
        updatedAt: String(row.updated_at),
        lastSeenAt:
          typeof row.last_seen_at === "string" ? row.last_seen_at : null,
        displayName:
          typeof row.display_name === "string" && row.display_name.trim()
            ? row.display_name.trim()
            : null,
        country:
          typeof row.country === "string" && row.country.trim()
            ? row.country.trim()
            : null,
        currency:
          typeof row.currency === "string" && row.currency.trim()
            ? row.currency.trim()
            : null,
        niche: readString(asAnswers(row.onboarding), "niche").trim() || null,
        platforms: readPlatforms(asAnswers(row.onboarding)),
      } satisfies LinkedTalentMeta,
    ]),
  );

  const result = new Map<string, LinkedTalentMeta>();
  for (const row of linked) {
    const meta = byUserId.get(row.linked_user_id);
    if (meta) result.set(String(row.id), meta);
  }
  return result;
}

type RosterContentRow = {
  id: string;
  name: string;
  linked_user_id: string | null;
  currency: string | null;
  status: TalentStatus;
};

function contentFilterForRecords(records: RosterContentRow[]): string | null {
  const ownerIds = records.flatMap((row) =>
    row.linked_user_id ? [row.linked_user_id] : [],
  );
  const recordIds = records.map((row) => row.id);
  const parts: string[] = [];
  if (ownerIds.length > 0) parts.push(`owner_id.in.(${ownerIds.join(",")})`);
  if (recordIds.length > 0) {
    parts.push(`talent_record_id.in.(${recordIds.join(",")})`);
  }
  return parts.length > 0 ? parts.join(",") : null;
}

export type LinkedContentRow = {
  content: TrackerDetail;
  talentName: string;
  currency: string;
  talentId: string;
  recordStatus: TalentStatus;
};

export async function listAgencyLinkedContent(
  agencyId: string,
): Promise<LinkedContentRow[]> {
  const { data: records } = await supabase
    .from("talent_records")
    .select("id, name, linked_user_id, currency, status")
    .eq("agency_id", agencyId);

  const roster = (records ?? []).flatMap((row) => {
    if (typeof row.id !== "string" || typeof row.name !== "string") return [];
    return [
      {
        id: row.id,
        name: row.name,
        linked_user_id:
          typeof row.linked_user_id === "string" ? row.linked_user_id : null,
        currency: typeof row.currency === "string" ? row.currency : null,
        status: asStatus(row.status),
      } satisfies RosterContentRow,
    ];
  });
  const filter = contentFilterForRecords(roster);
  if (!filter) return [];

  const linkedIds = roster.flatMap((row) =>
    row.linked_user_id ? [row.linked_user_id] : [],
  );
  const { data: profiles } = linkedIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, currency")
        .in("id", linkedIds)
    : { data: [] as { id: string; display_name: string | null; currency: string | null }[] };

  const profileById = new Map(
    (profiles ?? []).map((row) => [
      String(row.id),
      {
        displayName:
          typeof row.display_name === "string" && row.display_name.trim()
            ? row.display_name.trim()
            : null,
        currency:
          typeof row.currency === "string" && row.currency.trim()
            ? row.currency.trim()
            : null,
      },
    ]),
  );

  const byId = new Map(roster.map((row) => [row.id, row]));
  const byOwner = new Map(
    roster.flatMap((row) =>
      row.linked_user_id ? [[row.linked_user_id, row] as const] : [],
    ),
  );

  const { data } = await supabase
    .from("content_items")
    .select(CONTENT_SELECT)
    .or(filter)
    .order("updated_at", { ascending: false });

  return (data ?? []).flatMap((row) => {
    const mapped = mapContent(row as ContentRow);
    const record =
      (mapped.talentRecordId ? byId.get(mapped.talentRecordId) : undefined) ??
      (mapped.creatorId ? byOwner.get(mapped.creatorId) : undefined);
    if (!record) return [];
    const live = record.linked_user_id
      ? profileById.get(record.linked_user_id)
      : undefined;
    return [
      {
        content: mapped,
        talentName: live?.displayName || record.name,
        currency: live?.currency || record.currency || "USD",
        talentId: record.id,
        recordStatus: record.status,
      },
    ];
  });
}

export async function listContentForTalentRecord(
  record: TalentRecord,
): Promise<TrackerDetail[]> {
  const filter = contentFilterForRecords([
    {
      id: record.id,
      name: record.name,
      linked_user_id: record.linked_user_id,
      currency: record.currency,
      status: record.status,
    },
  ]);
  if (!filter) return [];
  const { data } = await supabase
    .from("content_items")
    .select(CONTENT_SELECT)
    .or(filter)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((row) => mapContent(row as ContentRow));
}
