import type { PlatformAnswer } from "@/lib/profileAnswers";
import type { TalentStatus } from "@/lib/talent";

export type UserRole = "talent" | "agency";

export type Profile = {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  avatar_path: string | null;
  agency_name: string | null;
  country: string | null;
  currency: string | null;
  onboarding: Record<string, unknown>;
  onboarding_completed_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type { TalentStatus };

export type TalentRecord = {
  id: string;
  agency_id: string;
  name: string;
  email: string | null;
  status: TalentStatus;
  invite_code: string | null;
  linked_user_id: string | null;
  disconnected_at: string | null;
  declined_at: string | null;
  platform: string | null;
  handle: string | null;
  followers: number | null;
  niche: string | null;
  notes: string | null;
  location: string | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
};

/** Live profile fields for a talent who has joined, keyed by talent_records.id. */
export type LinkedTalentMeta = {
  avatarPath: string | null;
  updatedAt: string;
  lastSeenAt: string | null;
  displayName: string | null;
  country: string | null;
  currency: string | null;
  niche: string | null;
  platforms: PlatformAnswer[];
};

export type AgencyLink = {
  recordId: string;
  agencyName: string;
  status: "active" | "disconnected";
};

export type ConnectionRequest = {
  recordId: string;
  agencyName: string;
};
