import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { UserShell } from "@/components/shell/user-shell";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RolePill } from "@/components/ui/pills";
import { getUserPots, requireUser } from "@/lib/data/user";
import { HomeJoinCard } from "@/components/home/home-join-card";

export const metadata = { title: "Home" };

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 5 ? "Evening" : hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  return `${part}, ${name.split(" ")[0]}`;
}

export default async function HomePage() {
  const user = await requireUser();
  const pots = await getUserPots();

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-4xl px-6 py-10 space-y-8">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting(user.displayName)}
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              Pick up where your class left off.
            </p>
          </div>
          <Button href="/pots/new" variant="secondary">
            <Plus className="size-4" />
            Create a Pot
          </Button>
        </header>

        {pots.length === 0 ? (
          <Card>
            <EmptyState
              title="Join your first Pot"
              body="Enter a class code to see what your class is building."
            />
            <div className="px-6 pb-8 max-w-sm mx-auto">
              <HomeJoinCard />
            </div>
          </Card>
        ) : (
          <section className="space-y-3">
            <Eyebrow>Your Pots</Eyebrow>
            <div className="grid sm:grid-cols-2 gap-4">
              {pots.map((pot) => (
                <Link key={pot.id} href={`/p/${pot.id}`} className="block group">
                  <Card className="h-full group-hover:border-edge-strong transition-colors">
                    <CardSection className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-ink">{pot.title}</p>
                      <RolePill role={pot.role} />
                    </CardSection>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="max-w-sm pt-4">
              <Eyebrow className="pb-2">Have a class code?</Eyebrow>
              <HomeJoinCard />
            </div>
          </section>
        )}
      </div>
    </UserShell>
  );
}
