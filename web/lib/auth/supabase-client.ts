"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import {
  AuthError,
  type AuthErrorCode,
  type ClientAuthProvider,
  type SecondFactorSetup,
  type SignInOutcome,
} from "@/lib/auth/types";

const SETUP_NAME = "Authenticator app";

/** Supabase reports failures as message text; map them once, here. */
function codeFor(message: string): AuthErrorCode {
  if (message.includes("email_taken")) return "email_taken";
  if (message.includes("weak_password")) return "weak_password";
  if (message.includes("invalid_email")) return "invalid_email";
  if (message.includes("invalid_display_name")) return "invalid_display_name";
  if (message.includes("rate_limited")) return "rate_limited";
  if (message.includes("Invalid login credentials")) return "invalid_credentials";
  return "unknown";
}

export const supabaseClientAuth: ClientAuthProvider = {
  name: "supabase",

  async getUserId(): Promise<string | null> {
    const {
      data: { user },
    } = await supabaseBrowser().auth.getUser();
    return user?.id ?? null;
  },

  async register({ email, password, displayName }): Promise<void> {
    // Registration goes through a database function rather than GoTrue signup:
    // hosted confirmations and the shared mailer rate limit make the built-in
    // path unusable here (memory/lessons/003).
    const { error } = await supabaseBrowser().rpc("register_student", {
      p_email: email,
      p_password: password,
      p_display_name: displayName,
    });
    if (error) throw new AuthError(codeFor(error.message), error.message);
  },

  async signIn({ email, password }): Promise<SignInOutcome> {
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new AuthError(codeFor(error.message), error.message);

    // A correct password only reaches aal1. An account carrying a confirmed
    // factor is still half way in until a code is verified.
    const { data: levels } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (levels?.currentLevel === "aal1" && levels.nextLevel === "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp.find((f) => f.status === "verified");
      if (factor) return { status: "second-factor-required", factorId: factor.id };
    }
    return { status: "signed-in" };
  },

  async signOut(): Promise<void> {
    await supabaseBrowser().auth.signOut();
  },

  async verifySecondFactor({ factorId, code }): Promise<void> {
    const { error } = await supabaseBrowser().auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) throw new AuthError("invalid_code", error.message);
  },

  async beginSecondFactorSetup(): Promise<SecondFactorSetup> {
    const supabase = supabaseBrowser();
    // An attempt that was never confirmed still holds the name, so clear those
    // out before asking for a fresh secret.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: SETUP_NAME,
    });
    if (error || !data) throw new AuthError("unknown", error?.message);
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
  },

  async completeSecondFactorSetup({ factorId, code }): Promise<void> {
    const { error } = await supabaseBrowser().auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) throw new AuthError("invalid_code", error.message);
  },

  async cancelSecondFactorSetup({ factorId }): Promise<void> {
    await supabaseBrowser().auth.mfa.unenroll({ factorId });
  },

  async removeSecondFactor({ factorId }): Promise<void> {
    const { error } = await supabaseBrowser().auth.mfa.unenroll({ factorId });
    if (error) throw new AuthError("unknown", error.message);
  },
};
