"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { classCodeSchema, parseOrNull } from "@/lib/validation/inputs";

/** Finalizes membership for a signed-in user and opens the Pot. */
export async function joinPotAction(code: string) {
  // Checked here as well as in the RPC: a malformed code should never become
  // a database round trip, and the redirect below needs a value it can put
  // in a query string safely.
  const parsed = parseOrNull(classCodeSchema, code);
  if (!parsed) redirect("/?error=notfound");

  const supabase = await supabaseServer();
  const { data: potId, error } = await supabase.rpc("join_pot_with_code", {
    p_code: parsed,
  });
  if (error || !potId) {
    redirect(`/?code=${encodeURIComponent(parsed)}&error=notfound`);
  }
  redirect(`/p/${potId}`);
}
