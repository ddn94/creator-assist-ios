import { TalentProfileForm } from "@/components/profile";
import { LoadingBlock } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { readPlatforms, readString } from "@/lib/profileAnswers";

export default function EditTalentProfileScreen() {
  const { profile } = useAuth();
  if (!profile) return <LoadingBlock />;
  return (
    <TalentProfileForm
      mode="edit"
      initial={{
        name: profile.display_name ?? "",
        ageBracket: readString(profile.onboarding, "ageBracket"),
        country: profile.country ?? "",
        niche: readString(profile.onboarding, "niche"),
        platforms: readPlatforms(profile.onboarding),
      }}
    />
  );
}
