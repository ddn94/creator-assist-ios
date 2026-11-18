import { AddContentPanel, TrackerItemCard, type AddContentPayload } from "@/components/content";
import { showToast } from "@/components/Toast";
import { TourTarget } from "@/components/TourTarget";
import {
  EmptyText,
  FilterPills,
  FormAlert,
  LoadingBlock,
  PageHeader,
  Screen,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { addContent, setContentStage } from "@/lib/api";
import { listMyContent } from "@/lib/data";
import { toListItem } from "@/lib/map";
import { DEFAULT_PLATFORM, contentPlatformOptions } from "@/lib/platforms";
import { asAnswers, readPlatforms } from "@/lib/profileAnswers";
import {
  STAGES,
  STAGE_LABELS,
  nextStage,
  revisionBackStage,
  type ContentType,
  type Stage,
  type TrackerItem,
} from "@/lib/tracker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";

export default function TrackerScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const { add } = useLocalSearchParams<{ add?: string }>();
  const [rows, setRows] = useState<TrackerItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStage, setActiveStage] = useState<Stage>("concept");
  const [saveError, setSaveError] = useState<string | null>(null);
  const rowsRef = useRef<TrackerItem[]>([]);
  const chosenStage = useRef(false);

  function showRows(next: TrackerItem[]) {
    rowsRef.current = next;
    setRows(next);
  }

  const load = useCallback(async () => {
    if (!profile) return;
    const items = (await listMyContent(profile.id)).map(toListItem);
    showRows(items);
    // Product tour opens on the stage holding the sample collab, like the website.
    if (!chosenStage.current && profile.onboarding.productTour === "pending") {
      const tourItem = items.find((item) => item.title === "Sample paid collab") ?? items[0];
      if (tourItem) setActiveStage(tourItem.stage);
    }
    chosenStage.current = true;
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const counts = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((stage) => [stage, 0])) as Record<Stage, number>;
    for (const item of rows ?? []) map[item.stage] += 1;
    return map;
  }, [rows]);

  if (!profile || rows === null) return <LoadingBlock />;
  const me = profile;

  const platformOptions = contentPlatformOptions(
    readPlatforms(asAnswers(me.onboarding)).map((row) => row.platform),
  );
  const activeItems = rows.filter((item) => item.stage === activeStage);
  const sample = rows.find((item) => item.title === "Sample paid collab");
  const tourItemId = activeItems.some((item) => item.id === sample?.id)
    ? sample?.id
    : activeItems[0]?.id;

  function moveStage(id: string, stage: Stage) {
    const current = rowsRef.current;
    const item = current.find((row) => row.id === id);
    if (!item || item.stage === stage) return;
    setSaveError(null);
    showRows(current.map((row) => (row.id === id ? { ...row, stage } : row)));
    if (id.startsWith("pending-")) return;
    void setContentStage(me, id, stage).then((result) => {
      if (result.error) {
        showRows(current);
        setSaveError(result.error);
      }
    });
  }

  function addItem(payload: AddContentPayload) {
    if (!payload.title) return;
    const type: ContentType = payload.type === "paid_collab" ? "paid_collab" : "organic";
    const tempId = `pending-${Date.now()}`;
    const optimistic: TrackerItem = {
      id: tempId,
      title: payload.title,
      platform: payload.platform || DEFAULT_PLATFORM,
      niche: payload.niche || null,
      type,
      brandName: type === "paid_collab" ? payload.brandName || null : null,
      stage: "concept",
      goLiveDate: payload.goLiveDate || null,
    };
    const previous = rowsRef.current;
    setSaveError(null);
    showRows([optimistic, ...previous]);
    setActiveStage("concept");
    void addContent(me, {
      title: optimistic.title,
      platform: optimistic.platform,
      niche: optimistic.niche,
      type,
      brandName: optimistic.brandName,
      goLiveDate: optimistic.goLiveDate,
      notes: payload.notes,
    }).then((result) => {
      if ("error" in result) {
        showRows(previous);
        setSaveError(result.error);
        return;
      }
      const latest = rowsRef.current;
      const stage = latest.find((row) => row.id === tempId)?.stage ?? "concept";
      const next = latest.map((row) => (row.id === tempId ? { ...row, id: result.id } : row));
      showRows(next);
      showToast(`Your content “${optimistic.title}” was added.`);
      if (stage === "concept") return;
      void setContentStage(me, result.id, stage).then((stageResult) => {
        if (stageResult.error) {
          showRows(next.map((row) => (row.id === result.id ? { ...row, stage: "concept" } : row)));
          setSaveError(stageResult.error);
        }
      });
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
      <PageHeader title="Content Tracker" description="Concept to Go Live · every piece in one place" />
      <AddContentPanel
        defaultOpen={add === "1"}
        platformOptions={platformOptions}
        onAdd={addItem}
      />
      {saveError ? (
        <View style={{ marginBottom: 16 }}>
          <FormAlert error={saveError} />
        </View>
      ) : null}
      <FilterPills
        value={activeStage}
        onChange={(id) => setActiveStage(id as Stage)}
        items={STAGES.map((stage) => ({
          id: stage,
          label: STAGE_LABELS[stage],
          count: counts[stage] || undefined,
        }))}
      />
      <TourTarget name="tour-content-fallback" style={{ marginTop: 12, gap: 12 }}>
        {activeItems.map((item) => (
          <TrackerItemCard
            key={item.id}
            item={item}
            tourAnchor={item.id === tourItemId}
            onOpen={(id) => router.push(`/(talent)/tracker/${id}`)}
            onAdvance={(id) => {
              const stage = nextStage(item.stage);
              if (stage) moveStage(id, stage);
            }}
            onRevisionBack={(id) => {
              const stage = revisionBackStage(item.stage);
              if (stage) moveStage(id, stage);
            }}
          />
        ))}
        {activeItems.length === 0 ? (
          <EmptyText>Nothing in {STAGE_LABELS[activeStage]}.</EmptyText>
        ) : null}
      </TourTarget>
    </Screen>
  );
}
