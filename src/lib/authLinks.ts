import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

export const AUTH_REDIRECT = Linking.createURL("auth/callback");

export function parseAuthUrl(url: string): {
  code: string | null;
  next: string | null;
  type: string | null;
} {
  try {
    const parsed = Linking.parse(url);
    const query = parsed.queryParams ?? {};
    const code =
      typeof query.code === "string"
        ? query.code
        : typeof query.token_hash === "string"
          ? query.token_hash
          : null;
    const next = typeof query.next === "string" ? query.next : null;
    const type = typeof query.type === "string" ? query.type : null;

    // Hash fragments: creatorassist://auth/callback#access_token=...&type=recovery
    const hash = url.includes("#") ? url.split("#")[1] : "";
    if (hash) {
      const params = new URLSearchParams(hash);
      return {
        code: code ?? params.get("access_token"),
        next: next ?? params.get("next"),
        type: type ?? params.get("type"),
      };
    }

    return { code, next, type };
  } catch {
    return { code: null, next: null, type: null };
  }
}

/** Exchange a magic-link / recovery code and return where to send the user. */
export async function handleAuthRedirect(url: string): Promise<"reset" | "home" | "login"> {
  const { code, next, type } = parseAuthUrl(url);

  if (code && !code.includes(".")) {
    // PKCE code
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return "login";
  } else if (url.includes("access_token") || url.includes("refresh_token")) {
    // Implicit hash tokens — supabase-js may already pick these up via detectSessionInUrl
    // For RN we set the session from hash if present.
    const hash = url.includes("#") ? url.split("#")[1] : "";
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) return "login";
    }
  } else if (!code) {
    return "login";
  }

  if (next === "reset" || next === "/auth/reset" || type === "recovery") {
    return "reset";
  }
  return "home";
}
