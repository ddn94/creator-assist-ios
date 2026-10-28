import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ColorValue } from "react-native";
import { colors } from "@/lib/colors";

/** SF Symbols standing in for the website's Phosphor icons. */
const ICONS = {
  home: "house",
  homeFill: "house.fill",
  ideas: "lightbulb",
  ideasFill: "lightbulb.fill",
  tracker: "rectangle.stack",
  trackerFill: "rectangle.stack.fill",
  payments: "dollarsign.circle",
  paymentsFill: "dollarsign.circle.fill",
  pnl: "chart.bar",
  pnlFill: "chart.bar.fill",
  talent: "person.2",
  talentFill: "person.2.fill",
  plus: "plus",
  trash: "trash",
  pencil: "pencil",
  back: "arrow.left",
  forward: "arrow.right",
  chevronRight: "chevron.right",
  chevronLeft: "chevron.left",
  chevronDown: "chevron.down",
  search: "magnifyingglass",
  camera: "camera.fill",
  link: "link",
  check: "checkmark",
  close: "xmark",
  copy: "doc.on.doc",
  info: "info.circle.fill",
  brand: "building.2",
  globe: "globe",
  money: "banknote",
  calendar: "calendar",
  sort: "arrow.up.arrow.down",
  person: "person",
  signOut: "rectangle.portrait.and.arrow.right",
} as const satisfies Record<string, SymbolViewProps["name"]>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 18,
  color = colors.ink,
  weight = "semibold",
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  weight?: SymbolViewProps["weight"];
}) {
  return (
    <SymbolView
      name={ICONS[name]}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}
