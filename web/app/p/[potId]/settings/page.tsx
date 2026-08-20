import { RemovedNotesPanel } from "@/components/pot/removed-notes-panel";
import { SectionsPanel } from "@/components/pot/sections-panel";
import { SettingsPanel } from "@/components/pot/settings-panel";
import { PotShell } from "@/components/shell/pot-shell";
import { getRemovedNotes } from "@/lib/data/pot";
import { requireUser } from "@/lib/data/user";
import { supabaseServer } from "@/lib/supabase/server";

export default async function SettingsPage({ params }: PageProps<"/p/[potId]/settings">) {
  const { potId } = await params;
  const user = await requireUser();
  const supabase = await supabaseServer();
  const [{ data: pot }, { data: sectionRows }, removedNotes] = await Promise.all([
    supabase.from("pots").select("owner_id").eq("id", potId).maybeSingle(),
    supabase
      .from("sections")
      .select("id, title, position")
      .eq("pot_id", potId)
      .order("position", { ascending: true })
      .order("title", { ascending: true }),
    getRemovedNotes(potId),
  ]);

  return (
    <PotShell potId={potId}>
      {(potContext) => (
        <div className="mx-auto w-full max-w-2xl px-6 py-8 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Pot settings</h1>
            <p className="text-sm text-ink-muted">
              Identity, class code, sections, and membership.
            </p>
          </header>
          <SettingsPanel
            pot={potContext}
            isOwner={pot?.owner_id === user.id}
            sectionsSlot={
              potContext.role !== "member" ? (
                <>
                  <SectionsPanel potId={potContext.id} sections={sectionRows ?? []} />
                  <RemovedNotesPanel potId={potContext.id} notes={removedNotes} />
                </>
              ) : undefined
            }
          />
        </div>
      )}
    </PotShell>
  );
}
