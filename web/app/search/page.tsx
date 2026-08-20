import Link from "next/link";
import { Cards, MagnifyingGlass, Notebook, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { SearchControls } from "@/components/search/search-controls";
import { UserShell } from "@/components/shell/user-shell";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MIN_QUERY_LENGTH,
  parseSearchSort,
  parseSearchType,
  searchAcrossPots,
  type SearchKind,
} from "@/lib/data/search";
import { requireUser } from "@/lib/data/user";
import { relativeTime } from "@/lib/time";

export const metadata = { title: "Search" };

const KINDS: Record<SearchKind, { label: string; icon: typeof Notebook }> = {
  note: { label: "Note", icon: Notebook },
  summary: { label: "Study summary", icon: Sparkle },
  flashcard: { label: "Flashcard", icon: Cards },
};

function highlight(text: string, term: string) {
  const index = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-pending-soft text-ink rounded px-0.5">
        {text.slice(index, index + term.length)}
      </mark>
      {text.slice(index + term.length)}
    </>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  await requireUser();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const potId = typeof params.pot === "string" ? params.pot : undefined;
  const type = parseSearchType(params.type);
  const sort = parseSearchSort(params.sort);

  const { pots, activePot, results, counts } = await searchAcrossPots({
    query,
    type,
    potId,
    sort,
  });

  const term = query.trim();
  const searched = pots.length > 0 && term.length >= MIN_QUERY_LENGTH;
  const filtered = type !== "all" || Boolean(activePot);

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
        <header className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
          <SearchControls
            query={query}
            type={type}
            sort={sort}
            potId={activePot?.id}
            pots={pots}
            counts={searched ? counts : null}
          />
        </header>

        {pots.length === 0 ? (
          <Card>
            <EmptyState
              icon={<MagnifyingGlass />}
              title="Nothing to search yet"
              body="Join a Pot with a class code and everything the class shares turns up here."
              action={<Button href="/join">Join a Pot</Button>}
            />
          </Card>
        ) : !searched ? (
          <Card>
            <EmptyState
              icon={<MagnifyingGlass />}
              title="Search your class knowledge"
              body="Shared notes, study summaries, and flashcards from every Pot you are in. Try a topic, a classmate's name, a section, or a word from a note."
            />
          </Card>
        ) : results.length === 0 ? (
          <Card>
            <EmptyState
              icon={<MagnifyingGlass />}
              title="No matches yet"
              body={
                filtered
                  ? "Nothing here under these filters. Try All, widen it to every Pot, or use a different word."
                  : "Try a different word from the note, a shorter one, or check the spelling."
              }
              action={
                filtered ? (
                  <Button variant="secondary" href={`/search?q=${encodeURIComponent(term)}`}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-muted">
              {/* The list is capped, so say so rather than quietly dropping matches. */}
              {results.length < counts[type]
                ? `Showing ${results.length} of ${counts[type]} results`
                : `${results.length} ${results.length === 1 ? "result" : "results"}`}
              {` for "${term}"`}
              {activePot ? ` in ${activePot.title}` : ""}
            </p>
            {results.map((result) => {
              const kind = KINDS[result.kind];
              const Icon = kind.icon;
              // Notes carry their version count so the "most contributed" order
              // is readable rather than mysterious.
              const facts = [
                result.potTitle,
                ...result.meta,
                result.contributionCount > 1 ? `${result.contributionCount} versions` : null,
                relativeTime(result.timestamp),
              ].filter((fact): fact is string => Boolean(fact));
              return (
                <Link key={result.key} href={result.href} className="group block">
                  <Card className="transition-colors group-hover:border-edge-strong">
                    <CardSection className="space-y-1.5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Icon className="size-3.5 text-ink-faint" aria-hidden />
                        <Eyebrow>{kind.label}</Eyebrow>
                      </div>
                      <p className="text-sm font-medium text-ink transition-colors group-hover:text-primary">
                        {highlight(result.title, term)}
                      </p>
                      {result.excerpt ? (
                        <p className="text-[13px] leading-relaxed text-ink-muted">
                          {highlight(result.excerpt, term)}
                        </p>
                      ) : null}
                      {result.tags.length > 0 ? (
                        <ul className="flex flex-wrap gap-1.5 pt-0.5">
                          {result.tags.map((tag) => (
                            <li
                              key={tag}
                              className="rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-muted"
                            >
                              {tag}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="text-[12px] text-ink-faint">{facts.join(" · ")}</p>
                    </CardSection>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </UserShell>
  );
}
