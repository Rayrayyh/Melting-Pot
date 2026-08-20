import { redirect } from "next/navigation";
import { clerkServerAuth } from "@/lib/auth/clerk";
import { supabaseServerAuth } from "@/lib/auth/supabase-server";
import type { AuthUser, ServerAuthProvider } from "@/lib/auth/types";

export type { AuthUser } from "@/lib/auth/types";

/**
 * Provider selection is a config change, not a refactor: setting
 * NEXT_PUBLIC_AUTH_PROVIDER=clerk swaps the identity source behind the same
 * interface. Mirrors getOrganizer() in lib/organizer.
 */
export function getServerAuth(): ServerAuthProvider {
  if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === "clerk") {
    return clerkServerAuth;
  }
  return supabaseServerAuth;
}

/** The signed-in person, or null. */
export function getAuthUser(): Promise<AuthUser | null> {
  return getServerAuth().getUser();
}

/** The signed-in person, or a redirect to login. Use in protected pages. */
export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

/** The id of a confirmed second factor, when the account has one. */
export function getVerifiedSecondFactorId(): Promise<string | null> {
  return getServerAuth().getVerifiedSecondFactorId();
}
