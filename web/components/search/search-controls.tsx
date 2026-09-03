"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, type FormEvent, type MouseEvent } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { SectionPill } from "@/components/ui/pills";
import { Select } from "@/components/ui/select";
import type { SearchCounts, SearchPot, SearchSort, SearchType } from "@/lib/data/search";

const TYPES: Array<{ key: SearchType; label: string }> = [
  { key: "all", label: "All" },
  { key: "note", label: "Notes" },
  { key: "summary", label: "Summaries" },
  { key: "flashcard", label: "Flashcards" },
  { key: "section", label: "Sections" },
];

const SORTS: Array<{ key: SearchSort; label: string; hint: string }> = [
  { key: "recent", label: "Most recent", hint: "Newest first." },
  { key: "oldest", label: "Oldest first", hint: "The earliest thing the class shared, first." },
  {
    key: "contributed",
    label: "Most contributed",
    hint: "Notes the class has corrected the most come first, then everything else by date.",
  },
  { key: "title", label: "Title A to Z", hint: "Alphabetical by title." },
  { key: "title-desc", label: "Title Z to A", hint: "Reverse alphabetical by title." },
];

type Overrides = {
  q?: string;
  type?: SearchType;
  /** null clears the Pot filter; undefined keeps the current one. */
  pot?: string | null;
  sort?: SearchSort;
};

/**
 * Every control writes to the URL rather than to local state, so a result list
 * can be pasted to a classmate and the back button walks the filters.
 */
export function SearchControls({
  query,
  type,
  sort,
  potId,
  pots,
  counts,
}: {
  query: string;
  type: SearchType;
  sort: SearchSort;
  potId?: string;
  pots: SearchPot[];
  /** Null until a query has actually run, so the pills stay unlabelled. */
  counts: SearchCounts | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const ids = useId();
  const potLabelId = `${ids}-pot`;
  const sortLabelId = `${ids}-sort`;

  const scopedPot = pots.find((pot) => pot.id === potId);
  const activeSort = SORTS.find((option) => option.key === sort) ?? SORTS[0];

  function buildHref(overrides: Overrides): string {
    const nextQuery = (overrides.q ?? query).trim();
    const nextType = overrides.type ?? type;
    const nextPot = overrides.pot === undefined ? potId : overrides.pot;
    const nextSort = overrides.sort ?? sort;
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    // Defaults stay out of the URL so a shared link carries only what was chosen.
    if (nextType !== "all") params.set("type", nextType);
    if (nextPot) params.set("pot", nextPot);
    if (nextSort !== "recent") params.set("sort", nextSort);
    const search = params.toString();
    return search ? `/search?${search}` : "/search";
  }

  function typedQuery(): string {
    return inputRef.current?.value ?? query;
  }

  /**
   * Filtering after typing but before pressing enter should search what is in
   * the box. The href still describes the committed state, so opening a filter
   * in a new tab keeps working.
   */
  function handleFilterClick(event: MouseEvent<HTMLAnchorElement>, overrides: Overrides) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const typed = typedQuery();
    if (typed.trim() === query.trim()) return;
    event.preventDefault();
    router.push(buildHref({ ...overrides, q: typed }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildHref({ q: typedQuery() }));
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} role="search" className="flex max-w-lg gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            ref={inputRef}
            // Re-seeded when the committed query changes, so the box follows
            // the back button instead of holding an abandoned edit.
            key={query}
            name="q"
            defaultValue={query}
            placeholder={
              scopedPot ? `Search ${scopedPot.title}` : "Search notes, summaries, and flashcards"
            }
            aria-label="Search"
            autoFocus
            className="h-10 w-full rounded-(--radius-control) border border-edge-strong bg-surface pl-9 pr-3 text-sm text-ink transition-colors placeholder:text-ink-faint focus:border-primary focus:outline-none"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label="Filter by kind" className="flex flex-wrap gap-2">
          {TYPES.map(({ key, label }) => (
            <Link
              key={key}
              href={buildHref({ type: key })}
              onClick={(event) => handleFilterClick(event, { type: key })}
              aria-current={type === key ? "true" : undefined}
            >
              <SectionPill active={type === key}>
                {label}
                {counts ? <span className="ml-1.5 opacity-60">{counts[key]}</span> : null}
              </SectionPill>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {pots.length > 1 ? (
            <div className="flex items-center gap-2 text-[13px] text-ink-muted">
              <span id={potLabelId}>Pot</span>
              <Select
                labelledBy={potLabelId}
                value={potId ?? ""}
                options={[
                  { value: "", label: "All your Pots" },
                  ...pots.map((pot) => ({ value: pot.id, label: pot.title })),
                ]}
                onChange={(next) =>
                  router.push(buildHref({ pot: next || null, q: typedQuery() }))
                }
              />
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-[13px] text-ink-muted">
            <span id={sortLabelId}>Sort</span>
            <Select
              labelledBy={sortLabelId}
              value={sort}
              options={SORTS.map(({ key, label }) => ({ value: key, label }))}
              onChange={(next) => router.push(buildHref({ sort: next, q: typedQuery() }))}
            />
          </div>
        </div>
      </div>

      <p className="text-[12px] text-ink-faint">{activeSort.hint}</p>
    </div>
  );
}
