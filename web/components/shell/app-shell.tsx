"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { List, X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { NavNotifications } from "@/components/shell/nav-notifications";
import { NavProfile } from "@/components/shell/nav-profile";
import type { Notification } from "@/lib/data/notifications";
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
  notifications,
  children,
}: {
  displayName: string;
  email: string;
  avatarSrc?: string | null;
  nav: ReactNode;
  notifications: Notification[];
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // The drawer is a modal overlay and was missing the three things every
  // modal owes the reader: Escape to leave, a locked page behind it, and
  // focus that actually moves into the thing that just opened.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }
    document.addEventListener("keydown", onKeyDown);
    // Without this the page keeps scrolling under the overlay, so dismissing
    // the drawer returns you somewhere you did not choose to be.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const returnTo = document.activeElement as HTMLElement | null;
    // Captured now: by cleanup the ref may point somewhere else.
    const openerAtOpen = opener.current;
    closeButton.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
      // Send focus back where it came from rather than dumping it on body.
      (returnTo ?? openerAtOpen)?.focus?.();
    };
  }, [drawerOpen, closeDrawer]);
  const profile = <NavProfile displayName={displayName} email={email} avatarSrc={avatarSrc} />;
  // Pinned beside the profile rather than inside the scrolling nav: something
  // addressed to you should not be reachable only by scrolling past a class
  // list. The gap sits on the panel, so dismissing it closes the gap too.
  const alerts = <NavNotifications items={notifications} />;
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
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <aside className="mp-side hidden lg:block w-60 shrink-0 overflow-hidden border-r border-edge bg-surface">
          <div className="sticky top-14 flex h-[calc(100dvh-3.5rem)] flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
            {alerts}
            {profile}
          </div>
        </aside>
        <button
          type="button"
          ref={opener}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          className="lg:hidden fixed bottom-5 left-5 z-30 inline-flex size-11 items-center justify-center rounded-full bg-surface border border-edge-strong shadow-(--shadow-raised) text-ink"
        >
          <List className="size-5" />
        </button>
        {drawerOpen ? (
          <div className="lg:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/40"
              aria-hidden
              onClick={closeDrawer}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface border-r border-edge"
            >
              <div className="flex justify-end p-2">
                <button
                  type="button"
                  ref={closeButton}
                  onClick={closeDrawer}
                  aria-label="Close navigation"
                  className="inline-flex size-9 items-center justify-center rounded-(--radius-control) text-ink-muted hover:bg-sunken"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto" onClick={closeDrawer}>
                {nav}
              </div>
              {alerts}
              {profile}
            </div>
          </div>
        ) : null}
        <main id="main" className="mp-enter flex-1 min-w-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
