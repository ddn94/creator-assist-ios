import { AgencyProfileForm } from "@/components/profile";
import { LoadingBlock } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { readString } from "@/lib/profileAnswers";

export default function EditAgencyProfileScreen() {
  const { profile } = useAuth();
  if (!profile) return <LoadingBlock />;
  return (
    <AgencyProfileForm
      mode="edit"
      initial={{
        agencyName: profile.agency_name ?? "",
        name: profile.display_name ?? "",
        country: profile.country ?? "",
        rosterSize: readString(profile.onboarding, "rosterSize"),
      }}
    />
  );
}
