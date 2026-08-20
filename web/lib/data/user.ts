import { getAuthUser, requireAuthUser } from "@/lib/auth/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { PotRole } from "@/lib/database.types";

/**
 * Identity comes from the auth seam (lib/auth), not straight from Supabase, so
 * changing provider does not reach into every page. The queries below still
 * use the Supabase client, because that is the database rather than the
 * identity source.
 */
export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

/** The signed-in user, or a redirect to login. Use in protected pages. */
export function requireUser(): Promise<SessionUser> {
  return requireAuthUser();
}

export function getUser(): Promise<SessionUser | null> {
  return getAuthUser();
}

export type UserPot = {
  id: string;
  title: string;
  role: PotRole;
};

export async function getUserPots(): Promise<UserPot[]> {
  const user = await getAuthUser();
  if (!user) return [];
  const supabase = await supabaseServer();
  // RLS lets members read the whole roster of their pots, so the query must
  // still filter to the caller's own membership rows (see memory/lessons/005).
  const { data } = await supabase
    .from("memberships")
    .select("role, pots(id, title, archived_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  return (data ?? [])
    .filter((m) => m.pots && !m.pots.archived_at)
    .map((m) => ({ id: m.pots!.id, title: m.pots!.title, role: m.role }));
}

/**
 * True when the caller runs a Pot. Archived Pots still count: the account
 * holds that class's work either way.
 */
export async function ownsAnyPot(): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1);
  return (data ?? []).length > 0;
}
