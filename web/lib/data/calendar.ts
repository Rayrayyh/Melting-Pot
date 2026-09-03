import { supabaseServer } from "@/lib/supabase/server";

export type CalendarEntry = {
  noteId: string;
  potId: string;
  potTitle: string;
  title: string;
  contributorName: string;
  sharedAt: string;
};

/**
 * What the class actually did, by day.
 *
 * There is no events table in this product and no due dates, so this is not a
 * planner: it is a record. Every entry is a note that was really shared, read
 * straight off shared_at, which means the calendar can never disagree with the
 * feed. Row level security scopes it to the Pots you belong to without this
 * query naming them.
 */
export async function getMonthEntries(year: number, month: number): Promise<CalendarEntry[]> {
  const from = new Date(Date.UTC(year, month, 1)).toISOString();
  const to = new Date(Date.UTC(year, month + 1, 1)).toISOString();
  const supabase = await supabaseServer();

  // The embed hints are the real constraint names, which are not all the
  // Postgres default: the current version is shared_notes_current_version_fk,
  // not ..._id_fkey. Guessing that cost a silent empty calendar once already.
  const { data, error } = await supabase
    .from("shared_notes")
    .select(
      `id, pot_id, shared_at,
       pot:pots(title),
       current:note_versions!shared_notes_current_version_fk(title),
       contributor:profiles!shared_notes_contributor_id_fkey(display_name)`,
    )
    .is("removed_at", null)
    .gte("shared_at", from)
    .lt("shared_at", to)
    .order("shared_at", { ascending: true });

  if (error) {
    // Loud in the server log rather than an empty month that looks like a
    // quiet class.
    console.error("calendar query failed", error.message);
    return [];
  }
  if (!data) return [];

  return data.map((row) => {
    const r = row as unknown as {
      id: string;
      pot_id: string;
      shared_at: string;
      pot: { title: string } | null;
      current: { title: string } | null;
      contributor: { display_name: string } | null;
    };
    return {
      noteId: r.id,
      potId: r.pot_id,
      potTitle: r.pot?.title ?? "A Pot",
      title: r.current?.title ?? "Untitled note",
      contributorName: r.contributor?.display_name ?? "Someone",
      sharedAt: r.shared_at,
    };
  });
}
