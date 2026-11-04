import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { AddContentPanel, type AddContentPayload } from "@/components/content";
import { NotFound } from "@/components/NotFound";
import {
  DealTable,
  InvoicingCard,
  TalentInviteCard,
  TalentProfileHeader,
} from "@/components/roster";
import { ConfirmModal } from "@/components/Sheet";
import { ActivityFeed, DisconnectLink } from "@/components/shared";
import { showToast } from "@/components/Toast";
import {
  AppText,
  BackLink,
  FormAlert,
  IconButton,
  LoadingBlock,
  Screen,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { addContentForRecord, deleteTalentRecord } from "@/lib/api";
import { colors } from "@/lib/colors";
import { listContentChanges } from "@/lib/contentChanges";
import {
  getLinkedTalentAvatars,
  getTalentRecord,
  listContentForTalentRecord,
} from "@/lib/data";
import { contentPlatformOptions } from "@/lib/platforms";
import { buildTalentDetailFromRecord } from "@/lib/roster";
import { supabase } from "@/lib/supabase";
import type { TalentDetail } from "@/lib/talent";
import type { ContentType } from "@/lib/tracker";
import type { TalentRecord } from "@/lib/types";

/** Website /workspace/talent/[id] + TalentDetailView. */
export default function TalentDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const fromOverview = from === "overview";
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "missing" }
    | { status: "ready"; record: TalentRecord; talent: TalentDetail }
  >({ status: "loading" });
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const record = await getTalentRecord(String(id ?? ""));
    if (!record) {
      setState({ status: "missing" });
      return;
    }
    const [content, avatars] = await Promise.all([
      listContentForTalentRecord(record),
      getLinkedTalentAvatars(profile.id),
    ]);
    const activity = await listContentChanges(
      supabase,
      content.map((item) => item.id),
    );
    setState({
      status: "ready",
      record,
      talent: buildTalentDetailFromRecord(
        record,
        content,
        new Date(),
        avatars.get(record.id) ?? null,
        activity,
      ),
    });
  }, [id, profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function back() {
    if (fromOverview) router.navigate("/(agency)/overview");
    else if (router.canGoBack()) router.back();
    else router.navigate("/(agency)/talent");
  }

  if (!profile || state.status === "loading") return <LoadingBlock />;
  if (state.status === "missing") {
    return <NotFound label="Back to talent" onBack={() => router.navigate("/(agency)/talent")} />;
  }

  const me = profile;
  const { record, talent } = state;
  const joined = record.linked_user_id != null;
  const canDelete =
    talent.status === "disconnected" ||
    (!joined && (talent.status === "record" || talent.status === "invited" || talent.status === "requested"));
  const canDisconnect = talent.status === "active";
  const canAddContent = record.status === "record";

  async function handleDelete() {
    if (!canDelete || pending) return;
    setPending(true);
    setError(null);
    const result = await deleteTalentRecord(me, talent.id);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setConfirming(false);
    showToast(`“${talent.name}” was removed.`, "danger");
    back();
  }

  function addDeal(payload: AddContentPayload) {
    const type: ContentType = payload.type === "paid_collab" ? "paid_collab" : "organic";
    setAddError(null);
    void addContentForRecord(me, talent.id, {
      title: payload.title,
      platform: payload.platform,
      niche: payload.niche.trim() || null,
      type,
      brandName: type === "paid_collab" ? payload.brandName.trim() || null : null,
      goLiveDate: payload.goLiveDate || null,
      notes: payload.notes,
    }).then((result) => {
      if ("error" in result) {
        setAddError(result.error);
        return;
      }
      showToast(`“${payload.title.trim()}” was added for them.`);
      void load();
    });
  }

  return (
    <Screen tabs>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 40, marginBottom: 16 }}>
        <BackLink label={fromOverview ? "Overview" : "Talent"} onPress={back} />
        {canDelete ? (
          <IconButton
            icon="trash"
            label="Remove talent"
            color={colors.danger}
            filled
            disabled={pending}
            onPress={() => {
              setError(null);
              setConfirming(true);
            }}
          />
        ) : null}
        {canDisconnect ? (
          <DisconnectLink recordId={talent.id} name={talent.name} side="agency" onDone={() => void load()} />
        ) : null}
      </View>
      <View style={{ marginBottom: 24 }}>
        <TalentProfileHeader talent={talent} />
      </View>

      {talent.status === "record" ||
      talent.status === "invited" ||
      talent.status === "disconnected" ||
      talent.status === "requested" ? (
        <TalentInviteCard
          id={talent.id}
          email={record.email ?? talent.email}
          inviteCode={record.invite_code}
          declinedAt={record.declined_at}
          status={talent.status}
          onInvited={() => void load()}
        />
      ) : null}

      {canAddContent ? (
        <>
          <AddContentPanel
            label="Add deal"
            platformOptions={contentPlatformOptions(record.platform ? [record.platform] : [])}
            onAdd={addDeal}
          />
          {addError ? (
            <View style={{ marginBottom: 16 }}>
              <FormAlert error={addError} />
            </View>
          ) : null}
        </>
      ) : null}

      <DealTable
        deals={talent.deals}
        onOpen={(contentId) =>
          router.push(
            `/(agency)/talent/${talent.id}/content/${contentId}${fromOverview ? "?from=overview" : ""}` as never,
          )
        }
      />
      <InvoicingCard
        items={talent.invoicing}
        readOnly={talent.status === "disconnected"}
        onSaved={() => void load()}
      />
      <ActivityFeed items={talent.activity} />

      {talent.status === "active" ? (
        <AppText variant="caption">
          {talent.firstName} adds new deals from their side. You can still edit the ones you&apos;ve logged.
        </AppText>
      ) : talent.status === "requested" ? (
        <AppText variant="caption">
          You can still edit deals you&apos;ve logged. New ones unlock once they accept.
        </AppText>
      ) : talent.status === "invited" ? (
        <AppText variant="caption">
          Note: You can still edit deals you already logged. You can&apos;t add another while this invite is out.
        </AppText>
      ) : null}

      <ConfirmModal
        open={canDelete && confirming}
        title={`Remove ${talent.name}`}
        question={`Are you sure you want to remove ${talent.name}?`}
        detail={
          talent.status === "disconnected"
            ? "This removes them from your roster and deletes your copies of shared deals."
            : talent.status === "invited"
              ? "This cancels the invite code and deletes this card and every deal logged on it."
              : talent.status === "requested"
                ? "This cancels the connection request and deletes this card and every deal logged on it."
                : "This deletes the private card and every deal logged on it."
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
        pending={pending}
        error={error}
        onClose={() => setConfirming(false)}
        onConfirm={() => void handleDelete()}
      />
    </Screen>
  );
}
