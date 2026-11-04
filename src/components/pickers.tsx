import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { AppText, Button, TextField } from "@/components/ui";
import { calendarDay, parseCalendarDay } from "@/lib/calendarDay";
import { colors, fonts, radius } from "@/lib/colors";
import { CURRENCY_OPTIONS, currencyFlag } from "@/lib/countries";

export type SelectOption = { value: string; label: string };

/** Website Select — opens a sheet of choices (searchable when long). */
export function SelectField({
  value,
  options,
  onChange,
  placeholder = "Select",
  title,
  disabled,
  plain = false,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  /** No border — sits inside another control (MoneyField). */
  plain?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const searchable = options.length > 12;
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.value.toLowerCase().includes(needle),
    );
  }, [options, query]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title ?? placeholder}
        disabled={disabled}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
        style={({ pressed }) => [
          plain ? styles.plainTrigger : styles.trigger,
          pressed && !plain && { backgroundColor: colors.background },
          disabled && { opacity: 0.6 },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.triggerText, !selected && { color: colors.placeholder }]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Icon name="chevronDown" size={11} color={colors.muted} weight="bold" />
      </Pressable>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={title ?? placeholder}
        scroll={false}
      >
        {searchable ? (
          <View style={{ marginBottom: 10 }}>
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              iconLeft="search"
              round
              autoCorrect={false}
            />
          </View>
        ) : null}
        <FlatList
          data={visible}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 420 }}
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  active && { backgroundColor: colors.collab },
                  pressed && !active && { backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.optionText, active && { fontFamily: fonts.sansSemi }]}>
                  {item.label}
                </Text>
                {active ? <Icon name="check" size={14} color={colors.primaryHover} weight="bold" /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <AppText variant="caption" style={{ textAlign: "center", paddingVertical: 20 }}>
              No matches.
            </AppText>
          }
        />
      </Sheet>
    </>
  );
}

export function currencyChoices(code: string): SelectOption[] {
  const options = CURRENCY_OPTIONS.some((option) => option.value === code)
    ? CURRENCY_OPTIONS
    : [{ value: code, label: code }, ...CURRENCY_OPTIONS];
  return options.map((option) => ({
    value: option.value,
    label: `${currencyFlag(option.value)} ${option.value}`.trim(),
  }));
}

/** Website MoneyField — currency on the left, amount on the right. */
export function MoneyField({
  value,
  onChangeText,
  currency,
  onCurrencyChange,
  currencyDisabled,
  disabled,
  placeholder,
  ...props
}: Omit<TextInputProps, "value" | "onChangeText"> & {
  value: string;
  onChangeText: (value: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  currencyDisabled?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.money, disabled && { opacity: 0.6 }]}>
      <View style={styles.moneyCurrency}>
        <SelectField
          plain
          title="Currency"
          value={currency}
          options={currencyChoices(currency)}
          onChange={onCurrencyChange}
          disabled={disabled || currencyDisabled}
        />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? "0"}
        placeholderTextColor={colors.placeholder}
        style={styles.moneyInput}
        {...props}
      />
    </View>
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) {
    cells.push(calendarDay(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function displayDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Website DateField — a calendar in a sheet. Value is YYYY-MM-DD or "". */
export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  title = "Pick a date",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const picked = parseCalendarDay(value);
  const base = picked ? new Date(`${picked}T12:00:00`) : new Date();
  const [cursor, setCursor] = useState({ year: base.getFullYear(), month: base.getMonth() });
  const today = calendarDay();
  const cells = monthGrid(cursor.year, cursor.month);
  // Explicit rows of seven: percentage widths round past 100% and wrap early.
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function shift(by: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + by, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        disabled={disabled}
        onPress={() => {
          const start = picked ? new Date(`${picked}T12:00:00`) : new Date();
          setCursor({ year: start.getFullYear(), month: start.getMonth() });
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.trigger,
          pressed && { backgroundColor: colors.background },
          disabled && { opacity: 0.6 },
        ]}
      >
        <Text numberOfLines={1} style={[styles.triggerText, !picked && { color: colors.placeholder }]}>
          {picked ? displayDay(picked) : placeholder}
        </Text>
        <Icon name="calendar" size={14} color={colors.muted} weight="regular" />
      </Pressable>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              label="Clear"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => {
                onChange("");
                setOpen(false);
              }}
            />
            <Button
              label="Today"
              style={{ flex: 1 }}
              onPress={() => {
                onChange(today);
                setOpen(false);
              }}
            />
          </View>
        }
      >
        <View style={styles.calHeader}>
          <Pressable accessibilityLabel="Previous month" hitSlop={10} onPress={() => shift(-1)} style={styles.calNav}>
            <Icon name="chevronLeft" size={14} weight="bold" />
          </Pressable>
          <AppText variant="title">{monthLabel}</AppText>
          <Pressable accessibilityLabel="Next month" hitSlop={10} onPress={() => shift(1)} style={styles.calNav}>
            <Icon name="chevronRight" size={14} weight="bold" />
          </Pressable>
        </View>
        <View style={styles.calRow}>
          {WEEKDAYS.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.calWeekday}>
              {label}
            </Text>
          ))}
        </View>
        {weeks.map((week, row) => (
          <View key={`week-${row}`} style={styles.calRow}>
            {week.map((day, index) => {
              if (!day) return <View key={`empty-${row}-${index}`} style={styles.calCell} />;
              const active = day === picked;
              const isToday = day === today;
              return (
                <Pressable
                  key={day}
                  accessibilityLabel={displayDay(day)}
                  onPress={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                  style={styles.calCell}
                >
                  <View
                    style={[
                      styles.calDay,
                      isToday && !active && { borderWidth: 1, borderColor: colors.primary },
                      active && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calDayText,
                        active && { color: colors.onPrimary, fontFamily: fonts.sansSemi },
                      ]}
                    >
                      {Number(day.slice(8, 10))}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
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
  plainTrigger: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  triggerText: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radius.input,
  },
  optionText: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  money: {
    height: 44,
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.input,
    overflow: "hidden",
  },
  moneyCurrency: {
    minWidth: 92,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    justifyContent: "center",
  },
  moneyInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calNav: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  calRow: { flexDirection: "row" },
  calWeekday: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.muted,
    paddingBottom: 6,
  },
  calCell: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  calDay: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayText: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
});
