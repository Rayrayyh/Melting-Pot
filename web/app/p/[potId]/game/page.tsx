import { GameRoom } from "@/components/game/game-room";
import { PotShell } from "@/components/shell/pot-shell";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Class game" };

export default async function GamePage({ params, searchParams }: PageProps<"/p/[potId]/game">) {
  const { potId } = await params;
  const query = await searchParams;
  const supabase = await supabaseServer();

  // Only secured practice tests can run live: the room needs the server to
  // hold the answers, which is exactly what secured means.
  const { data: sets } = await supabase
    .from("study_sets")
    .select("id, payload, created_at")
    .eq("pot_id", potId)
    .eq("kind", "practice")
    .eq("secured", true)
    .is("removed_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <PotShell potId={potId}>
      {(pot) => (
        <GameRoom
          potId={pot.id}
          potTitle={pot.title}
          canHost={pot.role === "maintainer" || pot.role === "owner"}
          archived={pot.archived}
          hostSets={(sets ?? []).map((set) => {
            const payload = set.payload as { title?: unknown } | null;
            return {
              id: set.id,
              title:
                typeof payload?.title === "string" && payload.title.trim()
                  ? payload.title.trim()
                  : "Practice test",
            };
          })}
          initialCode={firstValue(query.room)}
          forcePoll={firstValue(query.transport) === "poll"}
        />
      )}
    </PotShell>
  );
}

function firstValue(value: string | string[] | undefined): string | null {
  const wanted = Array.isArray(value) ? value[0] : value;
  return typeof wanted === "string" && wanted.length > 0 ? wanted : null;
}
