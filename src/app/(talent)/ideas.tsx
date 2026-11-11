import { useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { IdeaCard } from "@/components/ideas";
import { SelectField } from "@/components/pickers";
import { showToast } from "@/components/Toast";
import {
  AppText,
  Button,
  Card,
  EmptyText,
  FilterPills,
  FormAlert,
  LoadingBlock,
  PageHeader,
  Screen,
  TextField,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { addIdea, deleteIdea, turnIdeaIntoContent, upsertIdea } from "@/lib/api";
import { calendarDay } from "@/lib/calendarDay";
import { listMyIdeas } from "@/lib/data";
import {
  IDEA_STATUSES,
  IDEA_STATUS_LABELS,
  IDEA_STATUS_OPTIONS,
  parseTags,
  type IdeaItem,
  type IdeaStatus,
} from "@/lib/ideas";

export default function IdeasScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<IdeaItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [turningId, setTurningId] = useState<string | null>(null);
  const turningRef = useRef<string | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "", tags: "", status: "idea" });

  const load = useCallback(async () => {
    if (!profile) return;
    setRows(await listMyIdeas(profile.id));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (rows ?? []).filter((idea) => {
      if (status !== "all" && idea.status !== status) return false;
      if (!needle) return true;
      return (
        idea.title.toLowerCase().includes(needle) ||
        idea.body.toLowerCase().includes(needle) ||
        idea.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [rows, status, query]);

  if (!profile || rows === null) return <LoadingBlock />;
  const me = profile;
  const current = rows;

  function handleAdd() {
    const title = draft.title.trim();
    if (!title) return;
    const nextStatus = IDEA_STATUSES.includes(draft.status as IdeaStatus)
      ? (draft.status as IdeaStatus)
      : "idea";
    const tempId = `pending-${Date.now()}`;
    const optimistic: IdeaItem = {
      id: tempId,
      creatorId: me.id,
      title,
      body: draft.body,
      tags: parseTags(draft.tags),
      status: nextStatus,
      createdAt: calendarDay(new Date()),
      linkedContentItemId: null,
    };
    const previous = current;
    setSaveError(null);
    setRows([optimistic, ...previous]);
    setDraft({ title: "", body: "", tags: "", status: "idea" });
    void addIdea(me, {
      title: optimistic.title,
      body: optimistic.body,
      tags: optimistic.tags,
      status: nextStatus,
    }).then((result) => {
      if ("error" in result) {
        setRows(previous);
        setSaveError(result.error);
        return;
      }
      setRows((latest) =>
        (latest ?? []).map((row) => (row.id === tempId ? { ...row, id: result.id } : row)),
      );
      showToast(`“${optimistic.title}” was added.`);
    });
  }

  return (
    <Screen
      tabs
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load().finally(() => setRefreshing(false));
      }}
    >
      <PageHeader title="Ideas" description="Brain dump · jot it down, organize later" />

      <Card style={{ marginBottom: 20 }}>
        <AppText variant="title" style={{ marginBottom: 12 }}>
          New idea
        </AppText>
        <View style={{ gap: 12 }}>
          <TextField
            value={draft.title}
            onChangeText={(title) => setDraft({ ...draft, title })}
            placeholder="Idea title"
          />
          <TextField
            value={draft.body}
            onChangeText={(body) => setDraft({ ...draft, body })}
            placeholder="Brain dump — hooks, angles, references…"
            multiline
          />
          <TextField
            value={draft.tags}
            onChangeText={(tags) => setDraft({ ...draft, tags })}
            placeholder="Tags (comma-separated)"
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <SelectField
                title="Status"
                value={draft.status}
                options={[...IDEA_STATUS_OPTIONS]}
                onChange={(value) => setDraft({ ...draft, status: value })}
              />
            </View>
            <Button label="Add" style={{ height: 44, paddingHorizontal: 24 }} disabled={!draft.title.trim()} onPress={handleAdd} />
          </View>
        </View>
      </Card>

      {saveError ? (
        <View style={{ marginBottom: 16 }}>
          <FormAlert error={saveError} />
        </View>
      ) : null}

      <FilterPills
        items={[
          { id: "all", label: "All" },
          ...IDEA_STATUSES.map((value) => ({ id: value, label: IDEA_STATUS_LABELS[value] })),
        ]}
        value={status}
        onChange={setStatus}
      />
      <View style={{ marginTop: 12 }}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search ideas"
          iconLeft="search"
          round
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={{ marginTop: 12, gap: 12 }}>
        {filtered.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            turning={turningId === idea.id}
            onViewContent={(contentId) => router.push(`/(talent)/tracker/${contentId}`)}
            onUpdate={(next) => {
              if (next.id.startsWith("pending-")) return;
              const previous = current;
              setSaveError(null);
              setRows(current.map((row) => (row.id === next.id ? next : row)));
              void upsertIdea({
                id: next.id,
                title: next.title,
                body: next.body,
                tags: next.tags,
                status: next.status,
                linkedContentItemId: next.linkedContentItemId,
              }).then((result) => {
                if (result.error) {
                  setRows(previous);
                  setSaveError(result.error);
                  return;
                }
                showToast("Idea saved.");
              });
            }}
            onDelete={(id) => {
              if (id.startsWith("pending-")) return;
              const previous = current;
              setSaveError(null);
              setRows(current.filter((row) => row.id !== id));
              void deleteIdea(id).then((result) => {
                if (result.error) {
                  setRows(previous);
                  setSaveError(result.error);
                  return;
                }
                showToast("Idea deleted.", "danger");
              });
            }}
            onTurnIntoContent={async (id) => {
              if (turningRef.current) return;
              turningRef.current = id;
              setTurningId(id);
              setSaveError(null);
              const idea = current.find((row) => row.id === id);
              const result = await turnIdeaIntoContent(me, id);
              turningRef.current = null;
              setTurningId(null);
              if ("error" in result) {
                setSaveError(result.error);
                return;
              }
              showToast(`Content added from your idea “${idea?.title ?? "Idea"}”.`);
              router.push(`/(talent)/tracker/${result.id}`);
            }}
          />
        ))}
        {filtered.length === 0 ? <EmptyText>No ideas here yet.</EmptyText> : null}
      </View>
    </Screen>
  );
}
