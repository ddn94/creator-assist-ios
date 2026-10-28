import type { PlatformAnswer } from "@/lib/profileAnswers";
import type { Category } from "@/lib/ui";

/** Canonical platform catalog — onboarding, tracker pickers, and defaults. */
export const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Other"] as const;

export type Platform = (typeof PLATFORMS)[number];

/** Named networks for profile/onboarding (freeform “Other” is a separate UI). */
export const PROFILE_PLATFORMS = PLATFORMS.filter(
  (platform) => platform !== "Other",
);

export const DEFAULT_PLATFORM: Platform = "Instagram";

export function contentPlatformOptions(
  platformNames: string[] = [],
  extra?: string | null,
): { value: string; label: string }[] {
  const custom = platformNames.filter(
    (platform) => !(PLATFORMS as readonly string[]).includes(platform),
  );
  const base = [...PLATFORMS, ...custom];
  const list = extra && !base.includes(extra) ? [...base, extra] : base;
  return list.map((platform) => ({ value: platform, label: platform }));
}

export function platformCategoryFor(platform: string): Category {
  if (platform === "TikTok") return "idea";
  if (platform === "YouTube") return "paid";
  return "organic";
}

/** Profile platform grid (website TalentPlatformGrid helpers). */

export type PlatformRow = {
  key: string;
  platform: string;
  enabled: boolean;
  handle: string;
  followers: string;
};

export type OtherPlatform = {
  enabled: boolean;
  platform: string;
  handle: string;
  followers: string;
};

export const EMPTY_OTHER_PLATFORM: OtherPlatform = {
  enabled: false,
  platform: "",
  handle: "",
  followers: "",
};

export function buildPlatformRows(
  platforms: PlatformAnswer[],
  mode: "wizard" | "edit",
): PlatformRow[] {
  const preset = PROFILE_PLATFORMS.map((platform) => {
    const account = platforms.find((p) => p.platform === platform);
    return {
      key: platform,
      platform,
      enabled: mode === "wizard" ? true : !!account,
      handle: account?.handle ?? "",
      followers:
        account && account.followers > 0 ? String(account.followers) : "",
    };
  });

  const custom = platforms
    .filter(
      (p) => !(PROFILE_PLATFORMS as readonly string[]).includes(p.platform),
    )
    .map((p) => ({
      key: p.platform,
      platform: p.platform,
      enabled: true,
      handle: p.handle ?? "",
      followers: p.followers > 0 ? String(p.followers) : "",
    }));

  return [...preset, ...custom];
}

export function collectPlatformAnswers(
  rows: PlatformRow[],
  other: OtherPlatform,
): PlatformAnswer[] {
  const fromRows = rows
    .filter((row) => row.enabled)
    .map((row) => ({
      platform: row.platform,
      followers: Number(row.followers) || 0,
      handle: row.handle.trim() || "",
    }));

  if (other.enabled && other.platform.trim()) {
    fromRows.push({
      platform: other.platform.trim(),
      followers: Number(other.followers) || 0,
      handle: other.handle.trim() || "",
    });
  }

  return fromRows;
}

export function platformCommunitySummary(
  rows: PlatformRow[],
  other: OtherPlatform,
) {
  const enabled = rows.filter((row) => row.enabled);
  const otherCount = other.enabled && other.platform.trim() ? 1 : 0;
  const totalFollowers =
    enabled.reduce((sum, row) => sum + (Number(row.followers) || 0), 0) +
    (other.enabled ? Number(other.followers) || 0 : 0);
  return {
    totalFollowers,
    platformCount: enabled.length + otherCount,
  };
}
