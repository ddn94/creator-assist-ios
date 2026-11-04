import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ContentDetailEditor } from "@/components/ContentDetailEditor";
import { NotFound } from "@/components/NotFound";
import { LoadingBlock } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import {
  getAgencyCopyId,
  getContentById,
  getLinkedTalentAvatars,
  getTalentRecord,
} from "@/lib/data";
import { pnlMoneyContext } from "@/lib/exchangeRates";
import type { RateBook } from "@/lib/fx";
import { contentPlatformOptions } from "@/lib/platforms";
import type { TrackerDetail } from "@/lib/tracker";

/** Website /workspace/talent/[id]/content/[contentId]. */
export default function AgencyContentScreen() {
  const { id, contentId, from } = useLocalSearchParams<{
    id: string;
    contentId: string;
    from?: string;
  }>();
  const { profile } = useAuth();
  const router = useRouter();
  const talentId = String(id ?? "");
  const fromOverview = from === "overview";
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "missing" }
    | { status: "ready"; item: TrackerDetail; currency: string; rates: RateBook }
  >({ status: "loading" });

  useEffect(() => {
    if (!profile) return;
    let live = true;
    void (async () => {
      const record = await getTalentRecord(talentId);
      if (!record) {
        if (live) setState({ status: "missing" });
        return;
      }
      const [item, linked] = await Promise.all([
        getContentById(String(contentId ?? "")),
        getLinkedTalentAvatars(profile.id),
      ]);
      if (!item) {
        // A disconnect leaves the agency its own copy of the deal.
        const copyId = await getAgencyCopyId(String(contentId ?? ""), talentId);
        if (copyId) {
          const suffix = from ? `?from=${encodeURIComponent(from)}` : "";
          router.replace(`/(agency)/talent/${talentId}/content/${copyId}${suffix}` as never);
          return;
        }
      }
      const belongs =
        item != null &&
        (item.talentRecordId === record.id ||
          (record.linked_user_id != null && item.creatorId === record.linked_user_id));
      if (!belongs || !item) {
        if (live) setState({ status: "missing" });
        return;
      }
      const currency = linked.get(record.id)?.currency || record.currency || "USD";
      const money = await pnlMoneyContext(currency, [item]);
      if (live) setState({ status: "ready", item, currency, rates: money.rates });
    })();
    return () => {
      live = false;
    };
  }, [talentId, contentId, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function back() {
    if (router.canGoBack()) router.back();
    else router.navigate(`/(agency)/talent/${talentId}${fromOverview ? "?from=overview" : ""}` as never);
  }

  if (!profile || state.status === "loading") return <LoadingBlock />;
  if (state.status === "missing") {
    return <NotFound label="Back to talent" onBack={() => router.navigate(`/(agency)/talent/${talentId}` as never)} />;
  }

  return (
    <ContentDetailEditor
      key={state.item.id}
      initial={state.item}
      currency={state.currency}
      rates={state.rates}
      platformOptions={contentPlatformOptions([state.item.platform], state.item.platform)}
      mode={state.item.agencyCreated ? "record" : "agency"}
      onBack={back}
      onDeleted={back}
    />
  );
}
