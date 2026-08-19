import { MembersPanel, type MemberRow } from "@/components/pot/members-panel";
import { PotShell } from "@/components/shell/pot-shell";
import { requireUser } from "@/lib/data/user";
import { supabaseServer } from "@/lib/supabase/server";

export default async function MembersPage({ params }: PageProps<"/p/[potId]/members">) {
  const { potId } = await params;
  const user = await requireUser();
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("memberships")
    .select("user_id, role, created_at, profile:profiles!memberships_user_id_fkey(display_name)")
    .eq("pot_id", potId)
    .order("created_at", { ascending: true });

  const roleOrder = { owner: 0, maintainer: 1, member: 2 } as const;
  const members: MemberRow[] = (data ?? [])
    .map((row) => ({
      userId: row.user_id,
      name: row.profile?.display_name ?? "Member",
      role: row.role,
      joinedAt: row.created_at,
    }))
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name));

  return (
    <PotShell potId={potId}>
      {(pot) => (
        <div className="mx-auto w-full max-w-2xl px-6 py-8 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
            <p className="text-sm text-ink-muted">
              {members.length} {members.length === 1 ? "person" : "people"} in {pot.title}.
            </p>
          </header>
          <MembersPanel
            potId={pot.id}
            members={members}
            viewerId={user.id}
            viewerRole={pot.role}
          />
        </div>
      )}
    </PotShell>
  );
}
