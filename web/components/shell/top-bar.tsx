"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MagnifyingGlass, SignOut, User } from "@phosphor-icons/react";
import { Wordmark } from "@/components/shell/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { AvatarInitial } from "@/components/ui/avatar";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export function TopBar({
  displayName,
  searchScope,
}: {
  displayName: string;
  /** When set, search submits scoped to this Pot. */
  searchScope?: { potId: string; potTitle: string };
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            className="flex items-center rounded-full focus-visible:outline-2"
          >
            <AvatarInitial name={displayName} />
          </button>
          {menuOpen ? (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-56 bg-surface border border-edge rounded-(--radius-card) shadow-(--shadow-raised) py-1.5">
                <p className="px-3.5 py-2 text-sm font-medium text-ink border-b border-edge truncate">
                  {displayName}
                </p>
                <MenuItem
                  icon={<User className="size-4" />}
                  label="My contributions"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/me/contributions");
                  }}
                />
                <MenuItem
                  icon={<SignOut className="size-4" />}
                  label="Log out"
                  onClick={async () => {
                    setMenuOpen(false);
                    await supabaseBrowser().auth.signOut();
                    router.push("/");
                    router.refresh();
                  }}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-ink-muted hover:text-ink hover:bg-sunken transition-colors",
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}
