import { supabaseServer } from "@/lib/supabase/server";
import type { AuthUser, ServerAuthProvider } from "@/lib/auth/types";

/**
 * Identity read from the request cookies by Supabase Auth. The display name
 * lives in public.profiles rather than on the auth user, so reading a person
 * costs the auth check plus one row.
 */
export const supabaseServerAuth: ServerAuthProvider = {
  name: "supabase",

  async getUser(): Promise<AuthUser | null> {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      email: user.email ?? "",
      displayName: profile?.display_name ?? "Student",
    };
  },

  async getVerifiedSecondFactorId(): Promise<string | null> {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.mfa.listFactors();
    return data?.totp.find((factor) => factor.status === "verified")?.id ?? null;
  },
};
