import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { PotRole } from "@/lib/database.types";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

/** The signed-in user, or a redirect to login. Use in protected pages. */
export async function requireUser(): Promise<SessionUser> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
}

export async function getUser(): Promise<SessionUser | null> {
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
}

export type UserPot = {
  id: string;
  title: string;
  role: PotRole;
};

export async function getUserPots(): Promise<UserPot[]> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
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
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1);
  return (data ?? []).length > 0;
}
