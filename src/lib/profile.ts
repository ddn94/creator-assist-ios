import { asAnswers } from "@/lib/profileAnswers";
import type { Profile, UserRole } from "@/lib/types";

export { asAnswers, displayName, memberSinceLabel } from "@/lib/profileAnswers";

export function asProfile(row: Record<string, unknown>): Profile {
  const role: UserRole = row.role === "agency" ? "agency" : "talent";
  return {
    id: String(row.id),
    email: String(row.email),
    role,
    display_name: typeof row.display_name === "string" ? row.display_name : null,
    avatar_path: typeof row.avatar_path === "string" ? row.avatar_path : null,
    agency_name: typeof row.agency_name === "string" ? row.agency_name : null,
    country: typeof row.country === "string" ? row.country : null,
    currency: typeof row.currency === "string" ? row.currency : null,
    onboarding: asAnswers(row.onboarding),
    onboarding_completed_at:
      typeof row.onboarding_completed_at === "string"
        ? row.onboarding_completed_at
        : null,
    last_seen_at: typeof row.last_seen_at === "string" ? row.last_seen_at : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Same three placeholder rows as the website Profile → App section. */
export const PROFILE_APP_ROWS = [
  "Notifications",
  "Appearance",
  "Help & support",
] as const;
