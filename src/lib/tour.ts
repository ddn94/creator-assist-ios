import type { UserRole } from "@/lib/types";

export type TourStep = {
  id: string;
  /** Expo Router href for this step */
  href: string;
  /** Spotlight this view. Matches the website data-tour name. */
  target: string;
  /** Used when the specific card is not on screen. */
  fallback: string;
  /** Tab path the website also spotlights (FloatingTabBar path). */
  tab: string;
  title: string;
  body: string;
};

const talentSteps: TourStep[] = [
  {
    id: "content",
    href: "/(talent)/tracker",
    target: "tour-content",
    fallback: "tour-content-fallback",
    tab: "/tracker",
    title: "Content",
    body: "Every piece of content lives here. Add yours and move it from Concept to Go Live.",
  },
  {
    id: "idea",
    href: "/(talent)/ideas",
    target: "tour-idea",
    fallback: "tour-idea-fallback",
    tab: "/ideas",
    title: "Ideas",
    body: "This is an idea. Dump hooks and half-formed thoughts here before they become content.",
  },
  {
    id: "payments",
    href: "/(talent)/payments",
    target: "tour-payments",
    fallback: "tour-payments-fallback",
    tab: "/payments",
    title: "Payments",
    body: "Paid collabs show up here: what’s owed, what’s invoiced, and what’s been paid.",
  },
  {
    id: "pnl",
    href: "/(talent)/pnl",
    target: "tour-pnl",
    fallback: "tour-pnl-fallback",
    tab: "/pnl",
    title: "P&L",
    body: "Your profit and loss: what came in, what went out, what’s left.",
  },
];

const agencySteps: TourStep[] = [
  {
    id: "roster",
    href: "/(agency)/talent",
    target: "tour-roster",
    fallback: "tour-roster",
    tab: "/talent",
    title: "Talent",
    body: "Someone on your roster. You can track their deals before they join.",
  },
  {
    id: "deal",
    href: "/(agency)/talent",
    target: "tour-deal",
    fallback: "tour-deal",
    tab: "/talent",
    title: "Deal",
    body: "A deal you've logged for them. Once they join, it shows up on their side too.",
  },
  {
    id: "payments",
    href: "/(agency)/payments",
    target: "tour-payments",
    fallback: "tour-payments-fallback",
    tab: "/payments",
    title: "Payments",
    body: "Every deal across the roster lands here. You set invoice dates and terms.",
  },
  {
    id: "pnl",
    href: "/(agency)/pnl",
    target: "tour-pnl",
    fallback: "tour-pnl-fallback",
    tab: "/pnl",
    title: "P&L",
    body: "This is profit and loss across the roster: revenue, expenses, and what’s left.",
  },
];

export function tourSteps(role: UserRole): TourStep[] {
  return role === "agency" ? agencySteps : talentSteps;
}

export function tourStartHref(role: UserRole): string {
  return tourSteps(role)[0].href;
}
