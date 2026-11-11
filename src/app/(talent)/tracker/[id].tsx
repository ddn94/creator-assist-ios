import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ContentDetailEditor } from "@/components/ContentDetailEditor";
import { NotFound } from "@/components/NotFound";
import { LoadingBlock } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { listContentChanges } from "@/lib/contentChanges";
import { getContentById } from "@/lib/data";
import { pnlMoneyContext } from "@/lib/exchangeRates";
import { EMPTY_RATE_BOOK, type RateBook } from "@/lib/fx";
import { contentPlatformOptions } from "@/lib/platforms";
import { asAnswers, readPlatforms } from "@/lib/profileAnswers";
import { supabase } from "@/lib/supabase";
import type { TalentActivityItem } from "@/lib/talent";
import type { TrackerDetail } from "@/lib/tracker";

export default function TalentContentScreen() {
  const { id, from, section } = useLocalSearchParams<{
    id: string;
    from?: string;
    section?: string;
  }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "missing" }
    | { status: "ready"; item: TrackerDetail; rates: RateBook }
  >({ status: "loading" });
  const [activity, setActivity] = useState<TalentActivityItem[]>([]);
  const contentId = String(id ?? "");
  const fromPayments = from === "payments";

  const loadActivity = useCallback(async () => {
    setActivity(await listContentChanges(supabase, [contentId]));
  }, [contentId]);

  useEffect(() => {
    if (!profile) return;
    let live = true;
    void (async () => {
      const item = await getContentById(contentId);
      if (!live) return;
      if (!item || item.creatorId !== profile.id) {
        setState({ status: "missing" });
        return;
      }
      const currency = profile.currency?.trim() || "USD";
      const [money] = await Promise.all([pnlMoneyContext(currency, [item]), loadActivity()]);
      if (live) setState({ status: "ready", item, rates: money.rates ?? EMPTY_RATE_BOOK });
    })();
    return () => {
      live = false;
    };
  }, [contentId, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function back() {
    if (fromPayments) router.navigate("/(talent)/payments");
    else if (router.canGoBack()) router.back();
    else router.navigate("/(talent)/tracker");
  }

  if (!profile || state.status === "loading") return <LoadingBlock />;
  if (state.status === "missing") {
    return <NotFound label="Back to tracker" onBack={() => router.navigate("/(talent)/tracker")} />;
  }

  return (
    <ContentDetailEditor
      key={state.item.id}
      initial={state.item}
      currency={profile.currency?.trim() || "USD"}
      rates={state.rates}
      platformOptions={contentPlatformOptions(
        readPlatforms(asAnswers(profile.onboarding)).map((row) => row.platform),
        state.item.platform,
      )}
      mode="talent"
      activity={activity}
      backLabel={fromPayments ? "Payments" : "Back"}
      onBack={back}
      onDeleted={() => router.navigate("/(talent)/tracker")}
      onSaved={() => void loadActivity()}
      onOpenIdeas={() => router.navigate("/(talent)/ideas")}
      focusDeal={section === "deal"}
    />
  );
}
