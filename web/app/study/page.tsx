import Link from "next/link";
import { Brain, Cards, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { UserShell } from "@/components/shell/user-shell";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDashboard } from "@/lib/data/dashboard";
import { requireUser } from "@/lib/data/user";

export const metadata = { title: "Study" };

const KINDS = [
  { kind: "summary", label: "Summary", blurb: "A study guide from the whole Pot.", icon: <Sparkle weight="fill" /> },
  { kind: "flashcards", label: "Flashcards", blurb: "Recall cards from the shared notes.", icon: <Cards weight="fill" /> },
  { kind: "practice", label: "Practice test", blurb: "Sit a test, marked on the server.", icon: <Brain weight="fill" /> },
] as const;

/**
 * Study across every class at once.
 *
 * The three workspaces already existed but were reachable only from tiles on a
 * Pot's feed, so scrolling past them lost them. This is the nav's destination:
 * one page that lists what you can build, per class.
 */
export default async function StudyPage() {
  const user = await requireUser();
  const dashboard = await getDashboard(user.id);

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-4xl px-6 py-12 space-y-8">
        <header className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Study</h1>
          <p className="text-sm text-ink-muted">
            Built from the notes your class has shared. Nothing outside a Pot goes in.
          </p>
        </header>

        {dashboard.pots.length === 0 ? (
          <Card>
            <EmptyState
              title="Nothing to study yet"
              body="Join a class from Home, and whatever it shares becomes study material here."
            />
          </Card>
        ) : (
          dashboard.pots.map((pot) => (
            <section key={pot.id} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <Eyebrow>{pot.title}</Eyebrow>
                <Link
                  href={`/p/${pot.id}`}
                  className="text-[12px] text-ink-muted transition-colors hover:text-ink"
                >
                  Open the Pot
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {KINDS.map((k) => (
                  <Link key={k.kind} href={`/p/${pot.id}/study/${k.kind}`} className="mp-lift group block">
                    <Card className="h-full group-hover:border-edge-strong transition-colors">
                      <CardSection className="space-y-2">
                        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-sunken text-primary [&>svg]:size-[18px]">
                          {k.icon}
                        </span>
                        <p className="font-semibold text-ink group-hover:text-primary">{k.label}</p>
                        <p className="text-[12px] text-ink-muted">{k.blurb}</p>
                      </CardSection>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </UserShell>
  );
}
