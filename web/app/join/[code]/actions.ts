"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/** Finalizes membership for a signed-in user and opens the Pot. */
export async function joinPotAction(code: string) {
  const supabase = await supabaseServer();
  const { data: potId, error } = await supabase.rpc("join_pot_with_code", {
    p_code: code,
  });
  if (error || !potId) {
    redirect(`/?code=${encodeURIComponent(code)}&error=notfound`);
  }
  redirect(`/p/${potId}`);
}
