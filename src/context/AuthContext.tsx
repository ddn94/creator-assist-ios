import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { AUTH_REDIRECT } from "@/lib/authLinks";
import { fetchProfile } from "@/lib/data";
import { saveProfileAnswers } from "@/lib/api";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  configured: boolean;
  refreshProfile: () => Promise<Profile | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: {
    email: string;
    password: string;
    invite: string;
    role: UserRole;
  }) => Promise<{ error: string | null; message: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  completeOnboarding: (
    answers: Record<string, unknown>,
  ) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function normalizeCode(raw: string) {
  return raw.replace(/\s+/g, "").toUpperCase();
}

function authError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "Email or password is incorrect.";
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (lower.includes("database error")) {
    return "Could not create the account with that invite. Check the code and email.";
  }
  return message;
}

function inviteError(kind: string, role: UserRole) {
  if (kind === "used") {
    return "That invite code has already been used. Already signed up? Sign in.";
  }
  if (kind === "email_mismatch") {
    return "Use the email your invite was sent to.";
  }
  if (kind === "talent" && role === "agency") {
    return "This code is for a creator account. Switch to Creator to sign up.";
  }
  if (kind === "invalid") return "That invite code isn’t valid.";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = hasSupabaseEnv();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId || !configured) {
      setProfile(null);
      return null;
    }
    const next = await fetchProfile(userId);
    setProfile(next);
    return next;
  }, [configured]);

  useEffect(() => {
    if (!configured) return;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadProfile(data.session?.user.id).finally(() => {
        if (mounted) setReady(true);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadProfile(next?.user.id);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [configured, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      profile,
      configured,
      refreshProfile: async () => loadProfile(session?.user.id),
      signIn: async (email, password) => {
        if (!configured) return "Supabase is not configured yet.";
        const normalized = normalizeEmail(email);
        if (!normalized || !password) return "Enter your email and password.";
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });
        if (error) return authError(error.message);
        const next = await loadProfile(data.user?.id);
        if (!next) return "Signed in, but this account has no profile yet.";
        return null;
      },
      signUp: async ({ email, password, invite, role }) => {
        if (!configured) {
          return { error: "Supabase is not configured yet.", message: null };
        }
        const inviteCode = normalizeCode(invite);
        const normalizedEmail = normalizeEmail(email);
        if (!inviteCode) return { error: "Enter your invite code.", message: null };
        if (!normalizedEmail) return { error: "Enter your email.", message: null };
        if (password.length < 8) {
          return { error: "Use at least 8 characters.", message: null };
        }

        const { data: kind, error: lookupError } = await supabase.rpc(
          "lookup_invite",
          { p_code: inviteCode, p_email: normalizedEmail },
        );
        if (lookupError || typeof kind !== "string") {
          return {
            error: "Could not check that invite code. Try again.",
            message: null,
          };
        }
        const blocked = inviteError(kind, role);
        if (blocked) return { error: blocked, message: null };
        if (kind !== "waitlist" && kind !== "talent") {
          return { error: "That invite code isn’t valid.", message: null };
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: AUTH_REDIRECT,
            data: {
              invite_code: inviteCode,
              role: kind === "talent" ? "talent" : role,
            },
          },
        });
        if (error) return { error: authError(error.message), message: null };
        if (!data.session) {
          return {
            error: null,
            message: "Check your email to confirm your account, then sign in.",
          };
        }
        return { error: null, message: null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
      requestPasswordReset: async (email) => {
        if (!configured) return "Supabase is not configured yet.";
        const normalized = normalizeEmail(email);
        if (!normalized) return "Enter your email.";
        const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
          redirectTo: `${AUTH_REDIRECT}?next=reset`,
        });
        if (error && !error.message.toLowerCase().includes("user")) {
          return "Could not send a reset link. Try again.";
        }
        return null;
      },
      completeOnboarding: async (answers) => {
        if (!profile) return "Sign in to save your profile.";
        const { error } = await saveProfileAnswers(profile, answers, true);
        if (error) return error;
        await loadProfile(profile.id);
        return null;
      },
    }),
    [ready, session, profile, configured, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
