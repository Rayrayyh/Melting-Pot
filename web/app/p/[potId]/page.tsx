import { notFound } from "next/navigation";
import { UserShell } from "@/components/shell/user-shell";
import { supabaseServer } from "@/lib/supabase/server";

// Placeholder Pot page; the full Pot shell and feed land in plan step 4.
export default async function PotPage({ params }: PageProps<"/p/[potId]">) {
  const { potId } = await params;
  const supabase = await supabaseServer();
  const { data: pot } = await supabase
    .from("pots")
    .select("id, title, description")
    .eq("id", potId)
    .maybeSingle();
  if (!pot) notFound();

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{pot.title}</h1>
        {pot.description ? (
          <p className="text-sm text-ink-muted">{pot.description}</p>
        ) : null}
      </div>
    </UserShell>
  );
}
