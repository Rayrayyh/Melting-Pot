import { cache } from "react";
import { redirect } from "next/navigation";
import { clerkServerAuth } from "@/lib/auth/clerk";
import { supabaseServerAuth } from "@/lib/auth/supabase-server";
import type { AssuranceLevel, AuthUser, ServerAuthProvider } from "@/lib/auth/types";

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

/**
 * The signed-in person, or null.
 *
 * Memoized for the length of one request: a page, its shell, and every data
 * function below it all ask who is signed in, and that should be one round
 * trip rather than a dozen. React's cache is per request, so nothing is ever
 * shared between two people.
 */
export const getAuthUser = cache(
  (): Promise<AuthUser | null> => getServerAuth().getUser(),
);

export const getAssuranceLevel = cache(
  (): Promise<AssuranceLevel> => getServerAuth().getAssuranceLevel(),
);

/**
 * True when the account carries a second factor this session has not cleared.
 *
 * A correct password only ever reaches aal1. Enforcing the rest in the browser
 * makes it a screen: the React state is gone on reload and the session was
 * always fully authorized. This is the server's own read of the same question,
 * and it is what every protected page below goes through.
 */
export async function secondFactorOutstanding(): Promise<boolean> {
  const { current, next } = await getAssuranceLevel();
  return current === "aal1" && next === "aal2";
}

/** The signed-in person, or a redirect to login. Use in protected pages. */
export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (await secondFactorOutstanding()) redirect("/login/verify");
  return user;
}

/** The id of a confirmed second factor, when the account has one. */
export function getVerifiedSecondFactorId(): Promise<string | null> {
  return getServerAuth().getVerifiedSecondFactorId();
}
