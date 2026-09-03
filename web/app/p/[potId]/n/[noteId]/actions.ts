"use server";

import { getAuthUser } from "@/lib/auth/server";
import { supabaseServer } from "@/lib/supabase/server";
import { noteViewSchema, parseOrNull } from "@/lib/validation/inputs";

/** Remembers the last note the member opened, powering the dashboard's Continue link. */
export async function recordNoteView(potId: string, noteId: string) {
  const parsed = parseOrNull(noteViewSchema, { potId, noteId });
  if (!parsed) return;
  const user = await getAuthUser();
  if (!user) return;
  const supabase = await supabaseServer();
  // Row level security already limits this to the caller's own membership;
  // the filters keep the statement honest about what it is updating.
  await supabase
    .from("memberships")
    .update({ last_seen_note_id: parsed.noteId })
    .eq("pot_id", parsed.potId)
    .eq("user_id", user.id);
}
