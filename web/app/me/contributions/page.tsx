import { UserShell } from "@/components/shell/user-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "My contributions" };

// Placeholder; the full Shared / Drafts / Proposals view lands in plan step 6.
export default function MyContributionsPage() {
  return (
    <UserShell>
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your contributions</h1>
        <Card>
          <EmptyState
            title="Nothing here yet"
            body="Notes you share, drafts you start, and corrections you propose will collect here."
          />
        </Card>
      </div>
    </UserShell>
  );
}
