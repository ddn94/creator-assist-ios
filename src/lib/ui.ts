import { colors } from "@/lib/colors";

/** Same category system as the website lib/ui.ts. */
export type Category = "organic" | "idea" | "paid" | "payment";

export const categoryCard: Record<Category, { bg: string; border: string }> = {
  organic: { bg: colors.organic, border: colors.organicBorder },
  idea: { bg: colors.idea, border: colors.ideaBorder },
  paid: { bg: colors.collab, border: colors.collabBorder },
  payment: { bg: colors.payment, border: colors.paymentBorder },
};

export const categoryPill: Record<Category, { bg: string; fg: string }> = {
  organic: { bg: colors.organicPill, fg: colors.ink },
  idea: { bg: colors.ideaPill, fg: colors.ink },
  paid: { bg: colors.primary, fg: colors.onPrimary },
  payment: { bg: colors.paymentPill, fg: colors.ink },
};

/** Soft roster tags + payment status pills (website StatusTag). */
export const statusTagStyles = {
  active: { bg: colors.collab, fg: colors.primaryHover, border: null },
  invited: { bg: colors.idea, fg: colors.ink, border: null },
  record: { bg: colors.background, fg: colors.muted, border: null },
  overdue: { bg: colors.danger, fg: colors.onPrimary, border: null },
  awaiting: { bg: colors.ideaPill, fg: "#1a1d21", border: null },
  notInvoiced: { bg: colors.card, fg: colors.muted, border: colors.border },
  paid: { bg: colors.primary, fg: colors.onPrimary, border: null },
} as const;

export type StatusTagTone = keyof typeof statusTagStyles;

export const statCardTones = {
  collab: colors.collab,
  payment: colors.payment,
  organic: colors.organic,
  idea: colors.idea,
} as const;

export type StatCardTone = keyof typeof statCardTones;
