import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SelectField } from "@/components/pickers";
import { ConfirmModal, Sheet } from "@/components/Sheet";
import {
  AppText,
  Button,
  CategoryCard,
  CategoryPill,
  Field,
  IconButton,
  TextField,
} from "@/components/ui";
import { colors } from "@/lib/colors";
import {
  IDEA_STATUS_LABELS,
  IDEA_STATUS_OPTIONS,
  formatIdeaDate,
  ideaStatusCategory,
  parseTags,
  type IdeaItem,
  type IdeaStatus,
} from "@/lib/ideas";
import { categoryCard } from "@/lib/ui";

const BORDER: Record<IdeaStatus, string> = {
  idea: "rgba(246,203,119,0.25)",
  in_progress: "rgba(242,164,140,0.25)",
  used: "rgba(111,154,134,0.25)",
};

/** Website IdeaCard. */
export function IdeaCard({
  idea,
  turning = false,
  onUpdate,
  onDelete,
  onTurnIntoContent,
  onViewContent,
}: {
  idea: IdeaItem;
  turning?: boolean;
  onUpdate: (idea: IdeaItem) => void;
  onDelete: (id: string) => void;
  onTurnIntoContent: (id: string) => void;
  onViewContent: (contentId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const pending = idea.id.startsWith("pending-");
  const category = ideaStatusCategory(idea.status);

  return (
    <>
      <CategoryCard
        category={category}
        style={{ padding: 20, borderWidth: 1, borderColor: BORDER[idea.status] }}
      >
        <View style={styles.top}>
          <CategoryPill category={category} label={IDEA_STATUS_LABELS[idea.status]} />
          <AppText variant="caption">{formatIdeaDate(idea.createdAt)}</AppText>
        </View>
        <AppText variant="cardTitle" style={{ marginTop: 10, fontSize: 16 }}>
          {idea.title}
        </AppText>
        {idea.body ? (
          <AppText variant="caption" style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: colors.ink }}>
            {idea.body}
          </AppText>
        ) : null}
        {idea.tags.length > 0 ? (
          <AppText variant="caption" style={{ marginTop: 4 }}>
            {idea.tags.join(" · ")}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          {idea.linkedContentItemId ? (
            <Button
              label="View content item →"
              variant="secondary"
              style={{ height: 40, borderWidth: 0 }}
              onPress={() => onViewContent(idea.linkedContentItemId!)}
            />
          ) : (
            <Button
              label={turning ? "Turning into content…" : "Turn into content →"}
              style={{ height: 40 }}
              disabled={pending || turning}
              onPress={() => {
                if (!turning) onTurnIntoContent(idea.id);
              }}
            />
          )}
          <View style={{ flexDirection: "row", marginLeft: "auto" }}>
            <IconButton
              icon="trash"
              label="Delete"
              color={colors.muted}
              size={36}
              disabled={pending}
              onPress={() => setConfirming(true)}
            />
            <IconButton
              icon="pencil"
              label="Edit"
              color={colors.muted}
              size={36}
              disabled={pending}
              onPress={() => setEditing(true)}
            />
          </View>
        </View>
      </CategoryCard>
      <ConfirmModal
        open={confirming}
        title="Delete this idea"
        question={`Are you sure you want to delete “${idea.title}”?`}
        confirmLabel="Delete"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onDelete(idea.id);
        }}
      />
      <IdeaEditModal
        key={editing ? "open" : "closed"}
        idea={idea}
        open={editing}
        onClose={() => setEditing(false)}
        onSave={onUpdate}
      />
    </>
  );
}

/** Website IdeaEditModal. */
function IdeaEditModal({
  idea,
  open,
  onClose,
  onSave,
}: {
  idea: IdeaItem;
  open: boolean;
  onClose: () => void;
  onSave: (idea: IdeaItem) => void;
}) {
  // Remounted on open (see key above), so each edit starts from the saved idea.
  const [title, setTitle] = useState(idea.title);
  const [body, setBody] = useState(idea.body);
  const [tags, setTags] = useState(idea.tags.join(", "));
  const [status, setStatus] = useState<IdeaStatus>(idea.status);

  function save() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    onSave({ ...idea, title: nextTitle, body, tags: parseTags(tags), status });
    onClose();
  }

  const category = ideaStatusCategory(status);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit idea"
      description="Update the title, notes, tags, or status."
      footer={
        <>
          <Button label="Save changes" full disabled={!title.trim()} onPress={save} />
          <Button label="Cancel" variant="secondary" full onPress={onClose} />
        </>
      }
    >
      <View style={{ gap: 14 }}>
        <View style={[styles.preview, { backgroundColor: categoryCard[category].bg }]}>
          <CategoryPill category={category} label={IDEA_STATUS_LABELS[status]} />
          <AppText variant="caption" numberOfLines={1} style={{ flex: 1, color: colors.ink }}>
            {title.trim() || idea.title}
          </AppText>
        </View>
        <Field label="Title">
          <TextField value={title} onChangeText={setTitle} />
        </Field>
        <Field label="Notes">
          <TextField value={body} onChangeText={setBody} multiline />
        </Field>
        <Field label="Tags">
          <TextField value={tags} onChangeText={setTags} placeholder="Tags, comma-separated" />
        </Field>
        <Field label="Status">
          <SelectField
            title="Status"
            value={status}
            options={[...IDEA_STATUS_OPTIONS]}
            onChange={(value) => setStatus(value as IdeaStatus)}
          />
        </Field>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
