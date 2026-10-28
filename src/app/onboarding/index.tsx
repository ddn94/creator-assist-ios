import { AgencyProfileForm, TalentProfileForm } from "@/components/profile";
import { LoadingBlock } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { readString } from "@/lib/profileAnswers";

/** Website /onboarding and /onboarding/agency. */
export default function OnboardingScreen() {
  const { profile } = useAuth();
  if (!profile) return <LoadingBlock />;
  if (profile.role === "agency") {
    return (
      <AgencyProfileForm
        mode="wizard"
        initial={{
          agencyName: profile.agency_name ?? "",
          name: profile.display_name ?? "",
          rosterSize: readString(profile.onboarding, "rosterSize"),
        }}
      />
    );
  }
  return (
    <TalentProfileForm
      mode="wizard"
      initial={{
        name: profile.display_name ?? "",
        niche: readString(profile.onboarding, "niche"),
      }}
    />
  );
}
