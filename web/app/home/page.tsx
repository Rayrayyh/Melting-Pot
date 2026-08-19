import Link from "next/link";
import { Archive, Plus } from "@phosphor-icons/react/dist/ssr";
import { ActivityList } from "@/components/home/activity-list";
import {
  DraftsModule,
  ReviewQueueModule,
  RevisionRequestedModule,
} from "@/components/home/attention-modules";
import { HomeJoinCard } from "@/components/home/home-join-card";
import { PotStatCard } from "@/components/home/pot-stat-card";
import { UserShell } from "@/components/shell/user-shell";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { INVALID_CODE_MESSAGE } from "@/components/landing/join-card";
import { getDashboard } from "@/lib/data/dashboard";
import { requireUser } from "@/lib/data/user";

export const metadata = { title: "Home" };

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 5 ? "Evening" : hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  return `${part}, ${name.split(" ")[0]}`;
}

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const user = await requireUser();
  const params = await searchParams;
  // A dead invite link followed while signed in lands here with the failed
  // code, so the error is shown instead of silently swallowed.
  const joinCode = typeof params.code === "string" ? params.code : "";
  const joinError =
    params.error === "notfound"
      ? INVALID_CODE_MESSAGE
      : params.error === "busy"
        ? "Too many tries from this network. Wait a few minutes and try again."
        : params.error === "error"
          ? "We couldn't reach that Pot just now. Try again in a moment."
          : null;
  const dashboard = await getDashboard(user.id);
  const hasAttention =
    dashboard.reviewQueue.length > 0 ||
    dashboard.revisionRequested.length > 0 ||
    dashboard.drafts.length > 0;

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-5xl px-6 py-12 space-y-10">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting(user.displayName)}
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              {dashboard.reviewQueue.length > 0
                ? `${dashboard.reviewQueue.length} ${
                    dashboard.reviewQueue.length === 1 ? "correction is" : "corrections are"
                  } waiting on you.`
                : "Pick up where your class left off."}
            </p>
          </div>
          {dashboard.isMaintainerAnywhere || dashboard.pots.length === 0 ? (
            <Button href="/pots/new" variant="secondary">
              <Plus className="size-4" />
              Create a Pot
            </Button>
          ) : null}
        </header>

        {dashboard.pots.length === 0 ? (
          <Card>
            <EmptyState
              title="Join your first Pot"
              body="Enter a class code to see what your class is building."
            />
            <div className="px-6 pb-8 max-w-sm mx-auto">
              <HomeJoinCard initialCode={joinCode} initialError={joinError} />
            </div>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">
            <div className="space-y-6 min-w-0">
              {hasAttention ? (
                <section aria-label="Needs your attention" className="space-y-4">
                  <ReviewQueueModule items={dashboard.reviewQueue} />
                  <RevisionRequestedModule items={dashboard.revisionRequested} />
                  <DraftsModule items={dashboard.drafts} />
                </section>
              ) : null}

              <section className="space-y-3">
                <Eyebrow>Your Pots</Eyebrow>
                <div className="grid sm:grid-cols-2 gap-4">
                  {dashboard.pots.map((pot) => (
                    <PotStatCard key={pot.id} pot={pot} />
                  ))}
                </div>
              </section>

              {dashboard.archivedPots.length > 0 ? (
                <details>
                  <summary className="cursor-pointer text-[13px] text-ink-muted hover:text-ink transition-colors">
                    Archived Pots ({dashboard.archivedPots.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {dashboard.archivedPots.map((pot) => (
                      <Link
                        key={pot.id}
                        href={
                          pot.role === "owner" ? `/p/${pot.id}/settings` : `/p/${pot.id}`
                        }
                        className="block group"
                      >
                        <Card className="group-hover:border-edge-strong transition-colors">
                          <CardSection className="flex items-center gap-3 py-3.5">
                            <Archive className="size-4 text-ink-faint shrink-0" aria-hidden />
                            <p className="min-w-0 flex-1 text-sm text-ink truncate">
                              {pot.title}
                            </p>
                            <span className="text-[12px] text-ink-faint shrink-0">
                              {pot.role === "owner"
                                ? "Open settings to unarchive"
                                : "Still readable"}
                            </span>
                          </CardSection>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20">
              {/* Students lead with joining the next class; teachers lead
                  with what their classes are doing. */}
              {dashboard.isMaintainerAnywhere ? (
                <>
                  <ActivityList items={dashboard.activity} />
                  <Card>
                    <CardSection className="space-y-2.5">
                      <p className="text-sm font-semibold text-ink">Have a class code?</p>
                      <HomeJoinCard initialCode={joinCode} initialError={joinError} />
                    </CardSection>
                  </Card>
                </>
              ) : (
                <>
                  <Card>
                    <CardSection className="space-y-2.5">
                      <p className="text-sm font-semibold text-ink">Have a class code?</p>
                      <HomeJoinCard initialCode={joinCode} initialError={joinError} />
                    </CardSection>
                  </Card>
                  <ActivityList items={dashboard.activity} />
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </UserShell>
  );
}
