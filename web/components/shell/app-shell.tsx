"use client";

import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { NavProfile } from "@/components/shell/nav-profile";
import { TopBar } from "@/components/shell/top-bar";

/**
 * The persistent frame for every signed-in surface: top bar across the top,
 * a 240px left nav (collapsing to a drawer below lg) with the account control
 * pinned to its foot, and the content area.
 */
export function AppShell({
  displayName,
  email,
  avatarSrc,
  nav,
  searchScope,
  children,
}: {
  displayName: string;
  email: string;
  avatarSrc?: string | null;
  nav: ReactNode;
  searchScope?: { potId: string; potTitle: string };
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profile = <NavProfile displayName={displayName} email={email} avatarSrc={avatarSrc} />;
  return (
    <div className="flex min-h-dvh flex-col">
      {/* First thing in the tab order, invisible until it has focus. A
          keyboard reader should not have to walk the whole sidebar to reach
          the page they just opened. */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-full focus-visible:bg-ink focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-paper"
      >
        Skip to content
      </a>
      <TopBar searchScope={searchScope} />
      <div className="flex flex-1 min-h-0">
        <aside className="hidden lg:block w-60 shrink-0 border-r border-edge bg-surface">
          <div className="sticky top-14 flex h-[calc(100dvh-3.5rem)] flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
            {profile}
          </div>
        </aside>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="lg:hidden fixed bottom-5 left-5 z-30 inline-flex size-11 items-center justify-center rounded-full bg-surface border border-edge-strong shadow-(--shadow-raised) text-ink"
        >
          <List className="size-5" />
        </button>
        {drawerOpen ? (
          <div className="lg:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/40"
              aria-hidden
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface border-r border-edge">
              <div className="flex justify-end p-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation"
                  className="inline-flex size-9 items-center justify-center rounded-(--radius-control) text-ink-muted hover:bg-sunken"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto" onClick={() => setDrawerOpen(false)}>
                {nav}
              </div>
              {profile}
            </div>
          </div>
        ) : null}
        <main id="main" className="mp-enter flex-1 min-w-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
