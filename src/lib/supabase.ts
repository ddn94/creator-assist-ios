import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function hasSupabaseEnv() {
  return Boolean(url && publishableKey);
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  publishableKey || "placeholder",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export function avatarPublicUrl(
  path: string | null | undefined,
  version?: string | null,
) {
  if (!path || !url) return null;
  const base = `${url}/storage/v1/object/public/avatars/${path}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}
