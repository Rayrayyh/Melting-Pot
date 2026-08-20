"use client";

import { clerkClientAuth } from "@/lib/auth/clerk";
import { supabaseClientAuth } from "@/lib/auth/supabase-client";
import type { ClientAuthProvider } from "@/lib/auth/types";

export { AuthError } from "@/lib/auth/types";
export type { SecondFactorSetup, SignInOutcome } from "@/lib/auth/types";

/** Browser half of the seam. See lib/auth/server.ts for the selection rule. */
export function getClientAuth(): ClientAuthProvider {
  if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === "clerk") {
    return clerkClientAuth;
  }
  return supabaseClientAuth;
}
