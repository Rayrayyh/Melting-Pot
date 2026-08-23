import { Plus } from "@phosphor-icons/react/dist/ssr";
import { PotManager, type ManagedPot } from "@/components/pot/pot-manager";
import { UserShell } from "@/components/shell/user-shell";
import { Button } from "@/components/ui/button";
import { getDashboard } from "@/lib/data/dashboard";
import { requireUser } from "@/lib/data/user";

export const metadata = { title: "Your Pots" };

export default async function PotsPage() {
  const user = await requireUser();
  const dashboard = await getDashboard(user.id);

  // Active Pots carry their counts already. An archived one is listed from the
  // membership alone, so it has no counts to show and says so rather than
  // printing zeros that would read as an empty Pot.
  const pots: ManagedPot[] = [
    ...dashboard.pots.map((pot) => ({
      id: pot.id,
      title: pot.title,
      role: pot.role,
      archived: false,
      memberCount: pot.memberCount,
      noteCount: pot.noteCount,
      openProposalCount: pot.openProposalCount,
      lastActivityAt: pot.lastActivityAt,
    })),
    ...dashboard.archivedPots.map((pot) => ({
      id: pot.id,
      title: pot.title,
      role: pot.role,
      archived: true,
      memberCount: null,
      noteCount: null,
      openProposalCount: null,
      lastActivityAt: null,
    })),
  ];

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-4xl px-6 py-12 space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Your Pots</h1>
            <p className="text-sm text-ink-muted">
              Everything you belong to, including what you have archived. Owners can
              archive and delete from here.
            </p>
          </div>
          <Button href="/pots/new" variant="secondary">
            <Plus className="size-4" />
            Create a Pot
          </Button>
        </header>

        <PotManager pots={pots} />
      </div>
    </UserShell>
  );
}
