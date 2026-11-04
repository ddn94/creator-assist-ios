import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SelectField } from "@/components/pickers";
import {
  DeleteAccountLink,
  DisconnectLink,
  ProfilePhoto,
  TalentPlatformGrid,
} from "@/components/shared";
import { showToast } from "@/components/Toast";
import {
  AppText,
  BackLink,
  Button,
  Card,
  CategoryPill,
  Field,
  FormAlert,
  LoadingBlock,
  Screen,
  SettingsRow,
  TextField,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { changePassword, saveProfileAnswers } from "@/lib/api";
import { isAdminEmail } from "@/lib/admin";
import { colors } from "@/lib/colors";
import { COUNTRY_OPTIONS, countryName } from "@/lib/countries";
import { getMyAgencyLink } from "@/lib/data";
import {
  EMPTY_OTHER_PLATFORM,
  buildPlatformRows,
  collectPlatformAnswers,
  platformCategoryFor,
  platformCommunitySummary,
  type OtherPlatform,
  type PlatformRow,
} from "@/lib/platforms";
import { PROFILE_APP_ROWS, displayName, memberSinceLabel } from "@/lib/profile";
import { readPlatforms, readString, type PlatformAnswer } from "@/lib/profileAnswers";
import { AGE_BRACKETS, ROSTER_OPTIONS, fmtFollowers } from "@/lib/profileFormOptions";
import { avatarPublicUrl } from "@/lib/supabase";
import type { AgencyLink } from "@/lib/types";

function rosterLabel(value: string) {
  return ROSTER_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** Website AccountProfile (both roles). */
export function AccountProfileScreen() {
  const { profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [agencyLink, setAgencyLink] = useState<AgencyLink | null | undefined>(undefined);
  const agency = profile?.role === "agency";
  const base = agency ? "/(agency)/profile" : "/(talent)/profile";

  const load = useCallback(async () => {
    if (!profile) return;
    setAgencyLink(agency ? null : await getMyAgencyLink(profile.id));
  }, [profile, agency]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!profile || agencyLink === undefined) return <LoadingBlock />;

  const name = displayName(profile);
  const platforms = readPlatforms(profile.onboarding);
  const country = profile.country ? countryName(profile.country) : "";
  const roster = readString(profile.onboarding, "rosterSize");

  return (
    <Screen tabs>
      <AppText variant="title" style={{ fontSize: 20, textAlign: "center", marginBottom: 20 }}>
        Profile
      </AppText>
      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <ProfilePhoto
          userId={profile.id}
          name={name}
          src={avatarPublicUrl(profile.avatar_path, profile.updated_at)}
          onChanged={refreshProfile}
        />
        <AppText variant="heading" style={{ marginTop: 12, fontSize: 24, textAlign: "center" }}>
          {name}
        </AppText>
        <AppText variant="description" style={{ marginTop: 4, textAlign: "center" }}>
          {memberSinceLabel(profile.created_at)}
          {country ? ` · ${country}` : ""}
        </AppText>
        {agency && profile.agency_name ? (
          <AppText variant="description" style={{ marginTop: 4, textAlign: "center" }}>
            {profile.agency_name}
            {roster ? ` · ${rosterLabel(roster)}` : ""}
          </AppText>
        ) : null}
        {platforms.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16 }}>
            {platforms.map((platform) => (
              <CategoryPill
                key={platform.platform}
                category={platformCategoryFor(platform.platform)}
                label={`${platform.platform}${platform.followers > 0 ? ` · ${fmtFollowers(platform.followers)}` : ""}`}
              />
            ))}
          </View>
        ) : null}
      </View>

      <AppText variant="label" style={{ paddingHorizontal: 4, marginBottom: 8 }}>
        Account
      </AppText>
      <View style={{ gap: 12, marginBottom: 24 }}>
        <SettingsRow
          title="Edit profile"
          description={
            agency
              ? "Agency name, your name, country, and roster size"
              : "Name, age bracket, country, niche, platforms, and community size"
          }
          onPress={() => router.push(`${base}/edit` as never)}
        />
        <SettingsRow
          title="Change password"
          description="Update the password you use to sign in"
          onPress={() => router.push(`${base}/password` as never)}
        />
        {agencyLink?.status === "active" ? (
          <DisconnectLink
            recordId={agencyLink.recordId}
            name={agencyLink.agencyName}
            side="talent"
            onDone={() => void load()}
          />
        ) : null}
        <DeleteAccountLink role={profile.role} connectedToAgency={agencyLink?.status === "active"} />
      </View>

      {!agency ? (
        <>
          <AppText variant="label" style={{ paddingHorizontal: 4, marginBottom: 8 }}>
            App
          </AppText>
          <View style={{ gap: 12, marginBottom: 24 }}>
            {PROFILE_APP_ROWS.map((title) => (
              <SettingsRow
                key={title}
                title={title}
                onPress={() =>
                  router.push(`/(talent)/coming-soon?f=${encodeURIComponent(title)}` as never)
                }
              />
            ))}
          </View>
        </>
      ) : null}

      {isAdminEmail(profile.email) ? (
        <View style={{ marginBottom: 12 }}>
          <SettingsRow
            title="Waitlist"
            description="Invite codes for people who joined from the landing page"
            onPress={() => router.push("/admin/waitlist")}
          />
        </View>
      ) : null}

      <SettingsRow title="Sign out" onPress={() => void signOut()} />
    </Screen>
  );
}

function useProfileBack() {
  const router = useRouter();
  const { profile } = useAuth();
  return () => {
    if (router.canGoBack()) router.back();
    else router.navigate(profile?.role === "agency" ? "/(agency)/profile" : "/(talent)/profile");
  };
}

/** Website ChangePasswordForm page. */
export function ChangePasswordScreen() {
  const { profile } = useAuth();
  const back = useProfileBack();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (!profile) return;
    setPending(true);
    setError(null);
    const result = await changePassword(profile, { current, password, confirm });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    showToast("Password updated.");
    back();
  }

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackLink label="Back to profile" onPress={back} />
      </View>
      <Card>
        <AppText variant="title">Change password</AppText>
        <AppText variant="description" style={{ marginTop: 4 }}>
          Use the password you sign in with now, then choose a new one.
        </AppText>
        <View style={{ gap: 16, marginTop: 16 }}>
          <Field label="Current password">
            <TextField
              value={current}
              onChangeText={setCurrent}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
            />
          </Field>
          <Field label="New password">
            <TextField
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="8+ characters"
            />
          </Field>
          <Field label="Repeat new password">
            <TextField
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Same again"
            />
          </Field>
          <FormAlert error={error} />
          <Button
            label={pending ? "Saving…" : "Save password"}
            style={{ alignSelf: "flex-start" }}
            disabled={pending}
            onPress={() => void save()}
          />
        </View>
      </Card>
    </Screen>
  );
}

/** Two-segment progress, website OnboardingProgress. */
function OnboardingProgress({ step }: { step: 1 | 2 }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 16 }}>
      {[1, 2].map((value) => (
        <View
          key={value}
          style={{
            height: 6,
            width: 64,
            borderRadius: 3,
            backgroundColor: step === value ? colors.primary : colors.border,
          }}
        />
      ))}
    </View>
  );
}

/** Website TalentProfileForm (onboarding wizard + edit). */
export function TalentProfileForm({
  mode,
  initial,
}: {
  mode: "wizard" | "edit";
  initial: {
    name: string;
    ageBracket?: string;
    country?: string;
    niche?: string;
    platforms?: PlatformAnswer[];
  };
}) {
  const { profile, refreshProfile, completeOnboarding } = useAuth();
  const back = useProfileBack();
  const wizard = mode === "wizard";
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(initial.name);
  const [ageBracket, setAgeBracket] = useState(initial.ageBracket || "25_34");
  const [country, setCountry] = useState(initial.country ?? "");
  const [niche, setNiche] = useState(initial.niche ?? "");
  const [rows, setRows] = useState<PlatformRow[]>(() =>
    buildPlatformRows(initial.platforms ?? [], mode),
  );
  const [other, setOther] = useState<OtherPlatform>(EMPTY_OTHER_PLATFORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const summary = useMemo(() => platformCommunitySummary(rows, other), [rows, other]);

  async function save(complete: boolean) {
    if (!profile) return;
    setError(null);
    setPending(true);
    const answers = {
      name: name.trim(),
      ageBracket,
      country,
      niche: niche.trim(),
      platforms: collectPlatformAnswers(rows, other),
    };
    if (complete) {
      const message = await completeOnboarding(answers);
      if (message) {
        setError(message);
        setPending(false);
      }
      return;
    }
    const result = await saveProfileAnswers(profile, answers);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    await refreshProfile();
    showToast("Profile saved.");
    back();
  }

  const aboutFields = (
    <View style={{ gap: 14 }}>
      <Field label="Name">
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Your name or creator name"
          autoCapitalize="words"
        />
      </Field>
      <Field label="Age range">
        <SelectField
          title="Age range"
          value={ageBracket}
          options={[...AGE_BRACKETS]}
          onChange={setAgeBracket}
        />
      </Field>
      <Field label="Where are you based?">
        <SelectField
          title="Country"
          value={country}
          options={COUNTRY_OPTIONS}
          onChange={setCountry}
          placeholder="Select a country"
        />
      </Field>
      <Field label="Niche">
        <TextField value={niche} onChangeText={setNiche} placeholder="e.g. Lifestyle, Beauty, Fitness" />
      </Field>
    </View>
  );

  const grid = (
    <TalentPlatformGrid
      rows={rows}
      other={other}
      onUpdateRow={(key, patch) =>
        setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
      }
      onOtherChange={(patch) => setOther((prev) => ({ ...prev, ...patch }))}
    />
  );

  if (wizard) {
    return (
      <Screen>
        <View style={{ alignItems: "center", marginTop: 12, marginBottom: 28 }}>
          <AppText variant="heading" style={{ textAlign: "center" }}>
            Welcome to Creator Assist
          </AppText>
          <AppText variant="description" style={{ marginTop: 8, textAlign: "center" }}>
            A couple of quick questions to get to know you.
          </AppText>
          <OnboardingProgress step={step} />
        </View>
        {step === 1 ? (
          <Card>
            <AppText variant="title" style={{ fontSize: 17 }}>
              Step 1 of 2 — About you
            </AppText>
            <AppText variant="description" style={{ marginTop: 4, marginBottom: 16 }}>
              Who&apos;s creating?
            </AppText>
            {aboutFields}
            <Button
              label="Continue"
              iconRight="forward"
              full
              style={{ marginTop: 18 }}
              disabled={!country || !name.trim()}
              onPress={() => setStep(2)}
            />
          </Card>
        ) : (
          <Card>
            <AppText variant="title" style={{ fontSize: 17 }}>
              Step 2 of 2 — Your platforms
            </AppText>
            <AppText variant="description" style={{ marginTop: 4, marginBottom: 16 }}>
              Pick your platforms and add your community size.
            </AppText>
            {grid}
            <View style={{ marginTop: 14 }}>
              <FormAlert error={error} />
            </View>
            <View style={{ gap: 8, marginTop: 14 }}>
              <Button
                label={pending ? "Saving…" : "Finish setup"}
                iconRight="forward"
                full
                disabled={pending}
                onPress={() => void save(true)}
              />
              <Button label="Back" variant="secondary" full onPress={() => setStep(1)} />
            </View>
          </Card>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackLink label="Back to profile" onPress={back} />
      </View>
      <AppText variant="heading">Edit profile</AppText>
      <AppText variant="description" style={{ marginTop: 4, marginBottom: 20 }}>
        Total community:{" "}
        <AppText variant="description" style={{ color: colors.ink, fontFamily: "Inter_600SemiBold" }}>
          {fmtFollowers(summary.totalFollowers)}
        </AppText>{" "}
        across {summary.platformCount} platform{summary.platformCount === 1 ? "" : "s"}
      </AppText>
      <Card style={{ marginBottom: 20 }}>
        <AppText variant="title" style={{ marginBottom: 12 }}>
          About you
        </AppText>
        {aboutFields}
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <AppText variant="title" style={{ marginBottom: 12 }}>
          Platforms & community size
        </AppText>
        {grid}
      </Card>
      <FormAlert error={error} />
      <Button
        label={pending ? "Saving…" : "Save"}
        style={{ alignSelf: "flex-start", marginTop: 12 }}
        disabled={pending || !country || !name.trim()}
        onPress={() => void save(false)}
      />
    </Screen>
  );
}

/** Website AgencyProfileForm (onboarding + edit). */
export function AgencyProfileForm({
  mode,
  initial,
}: {
  mode: "wizard" | "edit";
  initial: { agencyName: string; name: string; country?: string; rosterSize?: string };
}) {
  const { profile, refreshProfile, completeOnboarding } = useAuth();
  const back = useProfileBack();
  const wizard = mode === "wizard";
  const [agencyName, setAgencyName] = useState(initial.agencyName);
  const [name, setName] = useState(initial.name);
  const [country, setCountry] = useState(initial.country ?? "");
  const [rosterSize, setRosterSize] = useState(initial.rosterSize || "1-10");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ready = Boolean(agencyName.trim() && name.trim() && country);

  async function save() {
    if (!profile || !ready) return;
    setError(null);
    setPending(true);
    const answers = { agencyName: agencyName.trim(), name: name.trim(), country, rosterSize };
    if (wizard) {
      const message = await completeOnboarding(answers);
      if (message) {
        setError(message);
        setPending(false);
      }
      return;
    }
    const result = await saveProfileAnswers(profile, answers);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    await refreshProfile();
    showToast("Profile saved.");
    back();
  }

  const fields = (
    <View style={{ gap: 14 }}>
      <Field label="Agency name">
        <TextField value={agencyName} onChangeText={setAgencyName} placeholder="Agency name" autoCapitalize="words" />
      </Field>
      <Field label="Your name">
        <TextField value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
      </Field>
      <Field label="Where are you based?">
        <SelectField
          title="Country"
          value={country}
          options={COUNTRY_OPTIONS}
          onChange={setCountry}
          placeholder="Select a country"
        />
      </Field>
      <Field label="Roster size">
        <SelectField
          title="Roster size"
          value={rosterSize}
          options={[...ROSTER_OPTIONS]}
          onChange={setRosterSize}
        />
      </Field>
      <FormAlert error={error} />
    </View>
  );

  if (wizard) {
    return (
      <Screen>
        <View style={{ alignItems: "center", marginTop: 12, marginBottom: 28 }}>
          <AppText variant="heading" style={{ textAlign: "center" }}>
            Welcome to Creator Assist
          </AppText>
          <AppText variant="description" style={{ marginTop: 8, textAlign: "center" }}>
            A few quick details to set up your workspace.
          </AppText>
        </View>
        <Card>
          <AppText variant="title" style={{ fontSize: 17 }}>
            About you
          </AppText>
          <AppText variant="description" style={{ marginTop: 4, marginBottom: 16 }}>
            Who&apos;s running this workspace?
          </AppText>
          {fields}
          <Button
            label={pending ? "Saving…" : "Finish setup"}
            iconRight="forward"
            full
            style={{ marginTop: 18 }}
            disabled={!ready || pending}
            onPress={() => void save()}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackLink label="Back to profile" onPress={back} />
      </View>
      <AppText variant="heading">Edit profile</AppText>
      <AppText variant="description" style={{ marginTop: 4, marginBottom: 20 }}>
        Your workspace details.
      </AppText>
      <Card>
        {fields}
        <Button
          label={pending ? "Saving…" : "Save"}
          style={{ alignSelf: "flex-start", marginTop: 16 }}
          disabled={pending || !ready}
          onPress={() => void save()}
        />
      </Card>
    </Screen>
  );
}
