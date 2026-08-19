import { SettingsPanel } from "@/components/pot/settings-panel";
import { PotShell } from "@/components/shell/pot-shell";
import { requireUser } from "@/lib/data/user";
import { supabaseServer } from "@/lib/supabase/server";

export default async function SettingsPage({ params }: PageProps<"/p/[potId]/settings">) {
  const { potId } = await params;
  const user = await requireUser();
  const supabase = await supabaseServer();
  const { data: pot } = await supabase
    .from("pots")
    .select("owner_id")
    .eq("id", potId)
    .maybeSingle();

  return (
    <PotShell potId={potId}>
      {(potContext) => (
        <div className="mx-auto w-full max-w-2xl px-6 py-8 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Pot settings</h1>
            <p className="text-sm text-ink-muted">
              Identity, class code, and membership.
            </p>
          </header>
          <SettingsPanel pot={potContext} isOwner={pot?.owner_id === user.id} />
        </div>
      )}
    </PotShell>
  );
}
