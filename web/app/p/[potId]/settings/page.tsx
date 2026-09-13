import { GoogleClassroom } from "@/components/pot/google-classroom";
import { SectionsPanel } from "@/components/pot/sections-panel";
import { SettingsPanel } from "@/components/pot/settings-panel";
import { PotShell } from "@/components/shell/pot-shell";
import { requireUser } from "@/lib/data/user";
import { supabaseServer } from "@/lib/supabase/server";

export default async function SettingsPage({ params }: PageProps<"/p/[potId]/settings">) {
  const { potId } = await params;
  const user = await requireUser();
  const supabase = await supabaseServer();
  const [{ data: pot }, { data: sectionRows }, { data: pushableRows }] = await Promise.all([
    supabase.from("pots").select("owner_id").eq("id", potId).maybeSingle(),
    supabase
      .from("sections")
      .select("id, title, position")
      .eq("pot_id", potId)
      .order("position", { ascending: true })
      .order("title", { ascending: true }),
    // What could be posted to Classroom: saved tests and decks, newest first.
    supabase
      .from("study_sets")
      .select("id, kind, payload")
      .eq("pot_id", potId)
      .in("kind", ["practice", "flashcards"])
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <PotShell potId={potId}>
      {(potContext) => (
        <div className="mx-auto w-full max-w-2xl px-6 py-8 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Pot settings</h1>
            <p className="text-sm text-ink-muted">
              Identity, class code, how the Pot runs, sections, and membership.
            </p>
          </header>
          <SettingsPanel
            pot={potContext}
            isOwner={pot?.owner_id === user.id}
            sectionsSlot={
              potContext.role !== "member" ? (
                // Removed notes used to sit here too. They live on the admin
                // page now, beside the removed sets and cards, so there is one
                // place to look for anything taken out rather than two.
                <SectionsPanel potId={potContext.id} sections={sectionRows ?? []} />
              ) : undefined
            }
          />
          {potContext.role !== "member" ? (
            <GoogleClassroom
              potId={potContext.id}
              potTitle={potContext.title}
              pushableSets={(pushableRows ?? []).map((row) => {
                const payload = row.payload as { title?: unknown } | null;
                const title =
                  typeof payload?.title === "string" && payload.title.trim()
                    ? payload.title.trim()
                    : row.kind === "practice"
                      ? "Practice test"
                      : "Flashcards";
                return { id: row.id, title, kind: row.kind as "practice" | "flashcards" };
              })}
            />
          ) : null}
        </div>
      )}
    </PotShell>
  );
}
