"use server";

import { getAuthUser } from "@/lib/auth/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Remembers the last note the member opened, powering the dashboard's Continue link. */
export async function recordNoteView(potId: string, noteId: string) {
  const user = await getAuthUser();
  if (!user) return;
  const supabase = await supabaseServer();
  await supabase
    .from("memberships")
    .update({ last_seen_note_id: noteId })
    .eq("pot_id", potId)
    .eq("user_id", user.id);
}
