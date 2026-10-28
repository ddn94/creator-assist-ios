import type { ComponentRef, ReactNode, Ref } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { cardShadow, colors, fonts, radius } from "@/lib/colors";
import {
  categoryCard,
  categoryPill,
  statCardTones,
  statusTagStyles,
  type Category,
  type StatCardTone,
  type StatusTagTone,
} from "@/lib/ui";

/** Extra room under tab screens for the bar's raised center button. */
export const TAB_BAR_SPACE = 48;

/** Text variants — same names as the website components/Text.tsx. */
const textVariants = StyleSheet.create({
  hero: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.ink },
  heading: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 16, lineHeight: 21, color: colors.ink },
  cardTitle: { fontFamily: fonts.displaySemi, fontSize: 14, lineHeight: 19, color: colors.ink },
  nav: { fontFamily: fonts.displaySemi, fontSize: 12, color: colors.muted },
  wordmark: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  subtitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 15,
    letterSpacing: 0.4,
    color: colors.primary,
  },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: colors.ink },
  description: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: colors.muted,
  },
  stat: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
});

export type TextVariant = keyof typeof textVariants;

export function AppText({
  variant = "body",
  style,
  ...props
}: TextProps & { variant?: TextVariant }) {
  return <Text {...props} style={[textVariants[variant], style]} />;
}

function Backdrop() {
  // Same soft circles the website draws behind every page.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, { right: -96, top: -112, width: 288, height: 288, backgroundColor: colors.idea }]} />
      <View style={[styles.blob, { left: -80, top: "33%", width: 160, height: 160, backgroundColor: colors.payment }]} />
      <View style={[styles.blob, { right: -64, bottom: 0, width: 128, height: 128, backgroundColor: colors.organic }]} />
    </View>
  );
}

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  /** Leave room for the floating tab bar. */
  tabs?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  center?: boolean;
  ref?: Ref<ComponentRef<typeof ScrollView>>;
};

export function Screen({
  children,
  scroll = true,
  tabs = false,
  refreshing,
  onRefresh,
  contentStyle,
  center,
  ref,
}: ScreenProps) {
  const bottom = tabs ? TAB_BAR_SPACE : 40;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <Backdrop />
      {scroll ? (
        <ScrollView
          ref={ref}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottom },
            center && styles.center,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, { flex: 1, paddingBottom: bottom }, contentStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <View style={{ marginBottom: 22, gap: 12 }}>
      {back}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{title}</AppText>
          {description ? (
            <AppText variant="description" style={{ marginTop: 4 }}>
              {description}
            </AppText>
          ) : null}
        </View>
        {action ? <View style={{ paddingTop: 4 }}>{action}</View> : null}
      </View>
    </View>
  );
}

export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.backLink, pressed && { opacity: 0.6 }]}
    >
      <Icon name="back" size={13} color={colors.muted} weight="bold" />
      <AppText variant="caption" style={{ fontFamily: fonts.sansMedium, fontSize: 13 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  padding = 20,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

export function CategoryCard({
  category,
  children,
  style,
  bordered = false,
}: {
  category: Category;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
}) {
  const tone = categoryCard[category];
  return (
    <View
      style={[
        { backgroundColor: tone.bg, borderRadius: radius.card, padding: 16 },
        bordered && { borderWidth: 1, borderColor: tone.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CategoryPill({ category, label }: { category: Category; label: string }) {
  const tone = categoryPill[category];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function StatusTag({ label, tone = "record" }: { label: string; tone?: StatusTagTone }) {
  const style = statusTagStyles[tone];
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: style.bg },
        style.border ? { borderWidth: 1, borderColor: style.border } : null,
      ]}
    >
      <Text style={[styles.pillText, { color: style.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function StatCard({
  label,
  value,
  footer,
  tone = "collab",
  valueColor,
  style,
}: {
  label: string;
  value: ReactNode;
  footer?: string;
  tone?: StatCardTone | "card";
  valueColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: tone === "card" ? colors.card : statCardTones[tone] },
        style,
      ]}
    >
      <AppText variant="caption" style={{ fontFamily: fonts.sansMedium }}>
        {label}
      </AppText>
      <AppText
        variant="stat"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[{ marginTop: 8, lineHeight: 28 }, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </AppText>
      {footer ? (
        <AppText variant="caption" style={{ marginTop: 8 }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "link" | "danger";
type ButtonSize = "xs" | "sm" | "md" | "lg";

const buttonHeights: Record<ButtonSize, number> = { xs: 32, sm: 44, md: 52, lg: 58 };

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "sm",
  full = false,
  disabled,
  loading,
  iconLeft,
  iconRight,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const filled = variant === "primary" || variant === "danger";
  const fg =
    variant === "link" ? colors.primaryHover : filled ? colors.onPrimary : colors.ink;
  if (variant === "link") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        hitSlop={8}
        style={({ pressed }) => [
          { flexDirection: "row", alignItems: "center", gap: 4 },
          (disabled || loading) && { opacity: 0.6 },
          pressed && { opacity: 0.6 },
          style,
        ]}
      >
        <Text style={[styles.linkText, { color: fg }]}>{label}</Text>
      </Pressable>
    );
  }
  const height = buttonHeights[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          paddingHorizontal: size === "xs" ? 16 : 20,
          backgroundColor:
            variant === "primary"
              ? pressed
                ? colors.primaryHover
                : colors.primary
              : variant === "danger"
                ? colors.danger
                : pressed
                  ? colors.background
                  : colors.card,
        },
        variant === "secondary" && styles.buttonSecondary,
        full && { alignSelf: "stretch" },
        (disabled || loading) && { opacity: 0.6 },
        pressed && variant === "danger" && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {iconLeft ? <Icon name={iconLeft} size={size === "xs" ? 13 : 15} color={fg} weight="bold" /> : null}
          <Text
            numberOfLines={1}
            style={[
              size === "xs" ? styles.buttonTextXs : styles.buttonText,
              { color: fg },
              variant === "secondary" && { fontFamily: fonts.displaySemi },
              size === "lg" && { fontSize: 16 },
            ]}
          >
            {label}
          </Text>
          {iconRight ? <Icon name={iconRight} size={size === "xs" ? 13 : 15} color={fg} weight="bold" /> : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color = colors.ink,
  label,
  disabled,
  filled = false,
  size = 40,
}: {
  icon: IconName;
  onPress?: () => void;
  color?: string;
  label: string;
  disabled?: boolean;
  filled?: boolean;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
        },
        filled && [{ backgroundColor: colors.card }, cardShadow],
        pressed && { backgroundColor: filled ? colors.organic : colors.card },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Icon name={icon} size={size > 36 ? 18 : 16} color={color} weight="regular" />
    </Pressable>
  );
}

/** Website FilterPills — scrolls sideways on a phone. */
export function FilterPills({
  items,
  value,
  onChange,
  style,
}: {
  items: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ marginHorizontal: -16, flexGrow: 0 }, style]}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {items.map((item) => {
        const active = item.id === value;
        const label = item.count == null ? item.label : `${item.label} ${item.count}`;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.id)}
            style={({ pressed }) => [
              styles.filterPill,
              active
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : pressed && { backgroundColor: colors.background },
            ]}
          >
            <Text style={[styles.filterPillText, active && { color: colors.onPrimary }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Website PillToggle — a segmented control in a white pill. */
export function PillToggle({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={[styles.toggle, cardShadow]}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.id)}
            style={[styles.toggleItem, active && { backgroundColor: colors.primary }]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.filterPillText, active && { color: colors.onPrimary }]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  hint,
  children,
  style,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <AppText variant="label">{label}</AppText>
      {children}
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  );
}

export function TextField({
  iconLeft,
  round,
  style,
  editable = true,
  ref,
  ...props
}: TextInputProps & {
  iconLeft?: IconName;
  round?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}) {
  return (
    <View
      style={[
        styles.input,
        round && { borderRadius: radius.pill },
        props.multiline && { height: undefined, minHeight: 84, alignItems: "flex-start", paddingVertical: 10 },
        !editable && { opacity: 0.6 },
      ]}
    >
      {iconLeft ? <Icon name={iconLeft} size={15} color={colors.muted} weight="bold" /> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.placeholder}
        editable={editable}
        style={[
          styles.inputText,
          props.multiline && { textAlignVertical: "top", minHeight: 64 },
          style as StyleProp<TextStyle>,
        ]}
        {...props}
      />
    </View>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      hitSlop={6}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 36 }}
    >
      <View
        style={[
          styles.checkbox,
          checked && { backgroundColor: colors.primary, borderColor: colors.primary },
        ]}
      >
        {checked ? <Icon name="check" size={11} color={colors.onPrimary} weight="heavy" /> : null}
      </View>
      <AppText variant="body" style={{ fontSize: 14, fontFamily: fonts.sansMedium }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const avatarSizes = { sm: 32, md: 40, lg: 48, xl: 96 } as const;

export function Avatar({
  name,
  size = "md",
  src,
}: {
  name: string;
  size?: keyof typeof avatarSizes;
  src?: string | null;
}) {
  const px = avatarSizes[size];
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={{
        width: px,
        height: px,
        borderRadius: px / 2,
        backgroundColor: colors.ink,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {src ? (
        <Image source={{ uri: src }} style={{ width: px, height: px }} />
      ) : (
        <Text
          style={{
            fontFamily: fonts.display,
            color: colors.onPrimary,
            fontSize: size === "xl" ? 36 : size === "lg" ? 16 : size === "md" ? 14 : 12,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

export function SettingsRow({
  title,
  description,
  onPress,
  danger = false,
}: {
  title: string;
  description?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.settingsRow,
        pressed && { backgroundColor: danger ? colors.organic : colors.background },
      ]}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="cardTitle" style={[{ fontSize: 16 }, danger && { color: colors.danger }]}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" style={{ marginTop: 2 }}>
            {description}
          </AppText>
        ) : null}
      </View>
      {!danger ? <Icon name="chevronRight" size={14} color={colors.muted} weight="bold" /> : null}
    </Pressable>
  );
}

export function FormAlert({
  error,
  message,
}: {
  error?: string | null;
  message?: string | null;
}) {
  if (error) {
    return (
      <View style={styles.alert}>
        <AppText variant="caption" style={{ fontSize: 14, lineHeight: 19, color: colors.danger }}>
          {error}
        </AppText>
      </View>
    );
  }
  if (message) {
    return (
      <AppText variant="caption" style={{ fontSize: 14, lineHeight: 20, color: colors.ink, textAlign: "center" }}>
        {message}
      </AppText>
    );
  }
  return null;
}

export function EmptyText({ children }: { children: ReactNode }) {
  return (
    <AppText variant="caption" style={{ fontSize: 14, textAlign: "center", paddingVertical: 32 }}>
      {children}
    </AppText>
  );
}

export function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <Card padding={16} style={{ paddingVertical: 32, alignItems: "center" }}>
      <AppText variant="description" style={{ textAlign: "center" }}>
        {children}
      </AppText>
    </Card>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <AppText variant="title" style={[{ fontSize: 19, marginBottom: 12 }, style]}>
      {children}
    </AppText>
  );
}

export function LoadingBlock() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

/** Website Pagination. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(0, page), totalPages - 1);
  const start = current * pageSize;
  return (
    <View style={styles.pagination}>
      <AppText variant="caption">
        {start + 1}–{Math.min(start + pageSize, total)} of {total}
      </AppText>
      <View style={{ flexDirection: "row" }}>
        <IconButton
          icon="chevronLeft"
          label="Previous page"
          size={32}
          disabled={current === 0}
          onPress={() => onPageChange(Math.max(0, current - 1))}
        />
        <IconButton
          icon="chevronRight"
          label="Next page"
          size={32}
          disabled={current >= totalPages - 1}
          onPress={() => onPageChange(Math.min(totalPages - 1, current + 1))}
        />
      </View>
    </View>
  );
}

/** List card with hairline dividers between rows (website divide-y sections). */
export function ListCard({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, { overflow: "hidden" }, style]}>
      {title ? (
        <View style={styles.listHeader}>
          <AppText variant="title">{title}</AppText>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function ListRow({
  children,
  onPress,
  last,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inner = [styles.listRow, !last && styles.listRowDivider, style];
  if (!onPress) return <View style={inner}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [...inner, pressed && { backgroundColor: colors.background }]}
    >
      {children}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12 },
  center: { justifyContent: "center" },
  blob: { position: "absolute", borderRadius: 999 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...cardShadow,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  pillText: { fontFamily: fonts.displaySemi, fontSize: 12 },
  statCard: { borderRadius: radius.card, padding: 16, flex: 1 },
  button: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonSecondary: { borderWidth: 1, borderColor: colors.border },
  buttonText: { fontFamily: fonts.display, fontSize: 15 },
  buttonTextXs: { fontFamily: fonts.sansMedium, fontSize: 12 },
  linkText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  filterPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterPillText: { fontFamily: fonts.displaySemi, fontSize: 14, color: colors.ink },
  toggle: {
    flexDirection: "row",
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    padding: 4,
  },
  toggleItem: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  input: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.input,
    paddingHorizontal: 12,
  },
  inputText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 0,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  alert: {
    backgroundColor: colors.organic,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: colors.background,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  listHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listRow: { paddingHorizontal: 16, paddingVertical: 14 },
  listRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
});
