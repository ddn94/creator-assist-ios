import { useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { Icon } from "@/components/Icon";
import { TourTarget } from "@/components/TourTarget";
import { DateField, SelectField } from "@/components/pickers";
import {
  AppText,
  Button,
  CategoryCard,
  CategoryPill,
  Field,
  TextField,
  styles as ui,
} from "@/components/ui";
import { colors, fonts } from "@/lib/colors";
import { DEFAULT_PLATFORM } from "@/lib/platforms";
import {
  CONTENT_TYPE_OPTIONS,
  STAGE_LABELS,
  contentCategory,
  contentPillLabel,
  formatLiveDate,
  nextStage,
  revisionBackStage,
  type TrackerItem,
} from "@/lib/tracker";

/** Website TrackerItemCard. */
export function TrackerItemCard({
  item,
  onOpen,
  onAdvance,
  onRevisionBack,
  tourAnchor = false,
}: {
  item: TrackerItem;
  onOpen?: (id: string) => void;
  onAdvance?: (id: string) => void;
  onRevisionBack?: (id: string) => void;
  /** Website tour-content: spotlight this card during the product tour. */
  tourAnchor?: boolean;
}) {
  const category = contentCategory(item.type);
  const pending = item.id.startsWith("pending-");
  const advanceTo = nextStage(item.stage);
  const backTo = revisionBackStage(item.stage);
  const meta = [
    item.platform,
    item.niche,
    item.type === "paid_collab" ? item.brandName : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const card = (
    <CategoryCard category={category}>
      <Pressable
        disabled={pending}
        onPress={() => onOpen?.(item.id)}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <CategoryPill category={category} label={contentPillLabel(item.type)} />
        <AppText variant="title" style={{ marginTop: 10, fontSize: 16 }}>
          {item.title}
        </AppText>
        {meta ? (
          <AppText variant="caption" style={{ marginTop: 4, fontSize: 14, lineHeight: 19 }}>
            {meta}
          </AppText>
        ) : null}
        {item.goLiveDate ? (
          <AppText variant="caption" style={{ marginTop: 2 }}>
            Live: {formatLiveDate(item.goLiveDate)}
          </AppText>
        ) : null}
      </Pressable>
      {advanceTo ? (
        <Pressable
          onPress={() => onAdvance?.(item.id)}
          style={({ pressed }) => [styles.advance, pressed && { opacity: 0.8 }]}
        >
          <AppText variant="cardTitle">Move to {STAGE_LABELS[advanceTo]} →</AppText>
        </Pressable>
      ) : null}
      {backTo ? (
        <Pressable onPress={() => onRevisionBack?.(item.id)} hitSlop={4} style={styles.back}>
          <AppText variant="caption" style={{ textAlign: "center" }}>
            Needs revisions? ← Back to {STAGE_LABELS[backTo]}
          </AppText>
        </Pressable>
      ) : null}
    </CategoryCard>
  );
  if (!tourAnchor) return card;
  return (
    <TourTarget name="tour-content" radius={24}>
      {card}
    </TourTarget>
  );
}

export type AddContentPayload = {
  title: string;
  platform: string;
  niche: string;
  type: string;
  brandName: string;
  goLiveDate: string;
  notes: string;
};

const EMPTY_DRAFT = {
  title: "",
  niche: "",
  type: "organic",
  brandName: "",
  goLiveDate: "",
  notes: "",
};

/** Website AddContentPanel — a card that opens into the add form. */
export function AddContentPanel({
  platformOptions,
  label = "Add content",
  defaultOpen = false,
  onAdd,
}: {
  platformOptions: { value: string; label: string }[];
  label?: string;
  defaultOpen?: boolean;
  onAdd: (payload: AddContentPayload) => void;
}) {
  const defaultPlatform = platformOptions[0]?.value ?? DEFAULT_PLATFORM;
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT, platform: defaultPlatform });

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((value) => !value);
  }

  function submit() {
    const title = draft.title.trim();
    if (!title) return;
    onAdd({
      title,
      platform: draft.platform || defaultPlatform,
      niche: draft.niche.trim(),
      type: draft.type,
      brandName: draft.brandName.trim(),
      goLiveDate: draft.goLiveDate,
      notes: draft.notes.trim(),
    });
    setDraft({ ...EMPTY_DRAFT, platform: defaultPlatform });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(false);
  }

  const paid = draft.type === "paid_collab";

  return (
    <View style={[ui.card, { marginBottom: 20 }]}>
      <Pressable onPress={toggle} style={styles.summary}>
        <View style={[styles.plus, open && { transform: [{ rotate: "45deg" }] }]}>
          <Icon name="plus" size={12} color={colors.onPrimary} weight="bold" />
        </View>
        <AppText variant="cardTitle" style={{ flex: 1, fontSize: 15 }}>
          {label}
        </AppText>
        {open ? (
          <Button
            label="Add"
            size="xs"
            disabled={!draft.title.trim()}
            onPress={submit}
          />
        ) : null}
      </Pressable>
      {open ? (
        <View style={styles.form}>
          <Field label="Title">
            <TextField
              value={draft.title}
              onChangeText={(title) => setDraft({ ...draft, title })}
              placeholder="Content title"
              autoFocus
              returnKeyType="done"
            />
          </Field>
          <View style={styles.row}>
            <Field label="Platform" style={{ flex: 1 }}>
              <SelectField
                title="Platform"
                value={draft.platform}
                options={platformOptions}
                onChange={(platform) => setDraft({ ...draft, platform })}
              />
            </Field>
            <Field label="Type" style={{ flex: 1 }}>
              <SelectField
                title="Type"
                value={draft.type}
                options={[...CONTENT_TYPE_OPTIONS]}
                onChange={(type) => setDraft({ ...draft, type })}
              />
            </Field>
          </View>
          <Field label="Niche / tag">
            <TextField
              value={draft.niche}
              onChangeText={(niche) => setDraft({ ...draft, niche })}
              placeholder="Niche"
            />
          </Field>
          {paid ? (
            <Field label="Brand (paid only)">
              <TextField
                value={draft.brandName}
                onChangeText={(brandName) => setDraft({ ...draft, brandName })}
                placeholder="Brand name"
                autoCapitalize="words"
              />
            </Field>
          ) : null}
          <Field label="Go-live date">
            <DateField
              title="Go-live date"
              value={draft.goLiveDate}
              onChange={(goLiveDate) => setDraft({ ...draft, goLiveDate })}
            />
          </Field>
          <Field label="Notes">
            <TextField
              value={draft.notes}
              onChangeText={(notes) => setDraft({ ...draft, notes })}
              placeholder="Optional notes"
              multiline
            />
          </Field>
          <Button label={label === "Add deal" ? "Add deal" : "Add content"} full disabled={!draft.title.trim()} onPress={submit} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  advance: {
    marginTop: 12,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  back: { marginTop: 4, paddingVertical: 8 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  plus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: 14, paddingHorizontal: 16, paddingBottom: 16 },
  row: { flexDirection: "row", gap: 10 },
  hint: { fontFamily: fonts.sans },
});
