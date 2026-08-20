"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Wordmark } from "@/components/shell/wordmark";

/**
 * The top bar carries the mark and search only. Account controls live at the
 * foot of the left nav, next to everything else that belongs to the person.
 */
export function TopBar({
  searchScope,
}: {
  /** When set, search submits scoped to this Pot. */
  searchScope?: { potId: string; potTitle: string };
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const params = new URLSearchParams({ q });
    if (searchScope) params.set("pot", searchScope.potId);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <header className="sticky top-0 z-30 h-14 bg-surface border-b border-edge flex items-center gap-4 px-4 lg:px-6">
      <Wordmark href="/home" />
      <form onSubmit={submitSearch} className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              searchScope ? `Search ${searchScope.potTitle}` : "Search your Pots and notes"
            }
            aria-label="Search"
            className="w-full h-9 pl-9 pr-3 bg-sunken border border-transparent rounded-(--radius-control) text-sm text-ink placeholder:text-ink-faint focus:bg-surface focus:border-edge-strong focus:outline-none transition-colors"
          />
        </div>
      </form>
    </header>
  );
}
