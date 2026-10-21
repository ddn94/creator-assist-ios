/** Matches creator-assist-new/app/globals.css */
export const colors = {
  background: "#faf5ea",
  card: "#ffffff",
  cardBorder: "#eff0ef",
  ink: "#20252b",
  muted: "#6b7280",
  placeholder: "#979ca6",
  border: "#e3ddcc",
  primary: "#6f9a86",
  primaryHover: "#5d8471",
  onPrimary: "#ffffff",
  danger: "#d9695a",
  organic: "#fce8e1",
  organicBorder: "#f0d2c6",
  organicPill: "#f2a48c",
  idea: "#fdf1dc",
  ideaBorder: "#f3e0b8",
  ideaPill: "#f6cb77",
  collab: "#e4eee9",
  collabBorder: "#cddfd4",
  payment: "#edeefb",
  paymentBorder: "#d8dcf0",
  paymentPill: "#abb0e8",
  white: "#ffffff",
  white40: "rgba(255,255,255,0.4)",
  overlay: "rgba(32,37,43,0.4)",
} as const;

export const fonts = {
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemi: "Inter_600SemiBold",
  display: "Urbanist_700Bold",
  displaySemi: "Urbanist_600SemiBold",
  displayHeavy: "Urbanist_800ExtraBold",
} as const;

/** Website shadow-card. */
export const cardShadow = {
  shadowColor: "#20252b",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
} as const;

export const radius = {
  card: 24,
  input: 12,
  pill: 999,
} as const;
