import Link from "next/link";
import { FolderSimple, MagnifyingGlass, Notebook, Paperclip } from "@phosphor-icons/react/dist/ssr";
import { UserShell } from "@/components/shell/user-shell";
import { Card, CardSection } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionPill } from "@/components/ui/pills";
import { searchPots, type SearchHit } from "@/lib/data/search";
import { requireUser } from "@/lib/data/user";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Search" };

function highlight(text: string, term: string) {
  const index = text.toLowerCase().indexOf(term.toLowerCase());
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

function hitHref(hit: SearchHit): string {
  if (hit.kind === "section" && hit.sectionId) return `/p/${hit.potId}/s/${hit.sectionId}`;
  if (hit.noteId) return `/p/${hit.potId}/n/${hit.noteId}`;
  return `/p/${hit.potId}`;
}

const KIND_ICON = {
  note: Notebook,
  section: FolderSimple,
  attachment: Paperclip,
} as const;

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  await requireUser();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const potId = typeof params.pot === "string" ? params.pot : undefined;

  let potTitle: string | null = null;
  if (potId) {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("pots")
      .select("title")
      .eq("id", potId)
      .maybeSingle();
    potTitle = data?.title ?? null;
  }

  const hits = await searchPots(query, potId);

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
          <form action="/search" className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-faint" />
              <input
                name="q"
                defaultValue={query}
                placeholder={potTitle ? `Search ${potTitle}` : "Search your Pots and notes"}
                aria-label="Search"
                autoFocus
                className="w-full h-10 pl-9 pr-3 bg-surface border border-edge-strong rounded-(--radius-control) text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none transition-colors"
              />
              {potId ? <input type="hidden" name="pot" value={potId} /> : null}
            </div>
            <button
              type="submit"
              className="h-10 px-4 rounded-(--radius-control) bg-primary text-on-primary text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Search
            </button>
          </form>
          {potTitle ? (
            <div className="flex items-center gap-2 text-[13px] text-ink-muted">
              Searching in
              <SectionPill active>{potTitle}</SectionPill>
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                className="text-primary hover:underline"
              >
                Search all Pots
              </Link>
            </div>
          ) : null}
        </header>

        {query.trim().length < 2 ? (
          <Card>
            <EmptyState
              icon={<MagnifyingGlass />}
              title="Search your class knowledge"
              body="Titles, summaries, note content, sections, contributors, and attachment names all count."
            />
          </Card>
        ) : hits.length === 0 ? (
          <Card>
            <EmptyState
              icon={<MagnifyingGlass />}
              title="No matches yet"
              body="Try a different word from the note, or check the spelling."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-muted">
              {hits.length} {hits.length === 1 ? "result" : "results"} for &quot;{query}&quot;
            </p>
            {hits.map((hit, i) => {
              const Icon = KIND_ICON[hit.kind];
              return (
                <Link key={`${hit.kind}-${i}`} href={hitHref(hit)} className="block group">
                  <Card className="group-hover:border-edge-strong transition-colors">
                    <CardSection className="flex items-start gap-3 py-4">
                      <Icon className="size-4 text-ink-faint mt-1 shrink-0" aria-hidden />
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-ink group-hover:text-primary transition-colors">
                          {highlight(hit.title, query)}
                        </p>
                        {hit.excerpt ? (
                          <p className="text-[13px] text-ink-muted leading-relaxed">
                            {highlight(hit.excerpt, query)}
                          </p>
                        ) : null}
                        <p className="text-[12px] text-ink-faint">
                          {hit.kind === "section" ? "Section" : hit.kind === "attachment" ? "Attachment" : hit.contributorName}
                          {hit.sectionTitle ? ` · ${hit.sectionTitle}` : ""}
                          {` · ${hit.potTitle}`}
                        </p>
                      </div>
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
