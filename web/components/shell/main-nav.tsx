"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarBlank,
  CaretRight,
  CookingPot,
  GraduationCap,
  House,
  MagnifyingGlass,
  Notebook,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export type NavPot = { id: string; title: string };

function Row({
  href,
  label,
  icon,
  active,
  chord,
  fx,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  chord?: string;
  /** The icon's hover micro-move, an mp-fx-* class from globals.css. */
  fx?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/row mp-fx flex items-center gap-2 h-9 px-3 rounded-(--radius-control) text-sm transition-colors min-w-0",
        active
          ? "bg-primary-soft text-primary font-medium"
          : "text-ink-muted hover:text-ink hover:bg-sunken",
      )}
    >
      <span aria-hidden className={cn("[&>svg]:size-[18px] shrink-0 me-0.5", fx)}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {chord ? (
        <>
          <kbd
            aria-hidden
            className="mp-kbd ml-auto shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 font-sans text-[11px] text-ink-muted opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 group-focus-visible/row:opacity-100"
          >
            {chord}
          </kbd>
          <span className="sr-only">, shortcut {chord}</span>
        </>
      ) : null}
    </Link>
  );
}

/**
 * One nav for the whole product.
 *
 * It is account level throughout: nothing here is scoped to a single Pot, so
 * the sidebar never changes shape underneath you. A Pot's own surfaces, its
 * feed, members, admin and settings, live inside the Pot where they belong.
 *
 * My Pots is the one exception, and it expands rather than navigating, so
 * getting to a class costs one click from anywhere without the nav becoming a
 * different nav once you are in one.
 *
 * Settings is not here at all. Personal settings belongs to the person, so it
 * lives in the profile card at the foot of the sidebar with their name and
 * avatar, and a Pot's settings belong to that Pot, so they live on it.
 */
/**
 * The modifier this device actually uses. Apple keyboards put Command where
 * everyone else puts Control, and showing the wrong glyph is worse than
 * showing none: it teaches a shortcut that does not work.
 *
 * Resolved after mount so the server and the first client render agree, then
 * corrected. userAgentData is the supported route; the platform string is the
 * fallback for browsers that do not ship it.
 */
const NO_CHANGE = () => () => {};

function isMacPlatform() {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

function useShortcutModifier() {
  // useSyncExternalStore rather than an effect: the platform never changes,
  // and this is the same shape the theme picker uses to read a client-only
  // value without writing state during render or from an effect. The server
  // snapshot is false, so the markup matches and the glyph corrects on
  // hydration.
  const mac = useSyncExternalStore(NO_CHANGE, isMacPlatform, () => false);
  return { mac, symbol: mac ? "\u2318" : "Ctrl" };
}

/**
 * Bare key destinations.
 *
 * Home and Study take their own initials. Calendar takes C because a calendar
 * is C everywhere a calendar has a shortcut, which left Contributions needing
 * a letter of its own: N, for the notes it actually lists. Naming it after
 * what the page contains beats naming it after the word on the tab.
 *
 * Slash for search is the one convention nobody has to be taught.
 */
const DESTINATION_KEYS: Record<string, string> = {
  h: "/home",
  s: "/study",
  c: "/calendar",
  n: "/me/contributions",
  "/": "/search",
};

export function MainNav({ pots }: { pots: NavPot[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mac, symbol } = useShortcutModifier();
  const inAPot = pathname.startsWith("/p/");
  // Open by default when you are already inside a Pot, so the sidebar shows
  // where you are rather than hiding it behind a closed group.
  const [open, setOpen] = useState(inAPot);

  useEffect(() => {
    /** True while the keystroke belongs to someone else: a text field, a
     *  rich text surface, or a component that has claimed bare keys for
     *  itself (a flashcard run, say, where losing the session to a stray
     *  letter is the worst thing the shortcut could do). */
    function isClaimed(target: HTMLElement | null) {
      if (!target) return false;
      if (target.isContentEditable) return true;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
      return Boolean(target.closest("[data-no-shortcuts]"));
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (isClaimed(target)) return;
      if (event.altKey) return;

      // Command or Control plus 1 to 9 jumps to that class. Only the first
      // nine get one, because there is no tenth digit and a two key chord for
      // a sidebar link is a shortcut nobody reaches for.
      if (mac ? event.metaKey : event.ctrlKey) {
        if (event.shiftKey) return;
        const index = Number(event.key) - 1;
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= Math.min(pots.length, 9)
        )
          return;
        event.preventDefault();
        setOpen(true);
        router.push(`/p/${pots[index].id}`);
        return;
      }

      // Bare letters for the destinations. Deliberately bare: the moment a
      // modifier is held the keystroke belongs to the browser or the OS, and
      // Control H, Command S and friends must keep meaning what they mean.
      if (event.metaKey || event.ctrlKey) return;
      const href = DESTINATION_KEYS[event.key.toLowerCase()];
      if (!href) return;
      event.preventDefault();
      router.push(href);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mac, pots, router]);

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 p-3">
      <Link
        href="/search"
        className="group/search mp-fx mb-4 flex h-9 items-center gap-2 rounded-(--radius-control) border border-edge bg-sunken px-3 text-sm text-ink-faint transition-colors hover:border-edge-strong hover:text-ink-muted"
      >
        <span aria-hidden className="mp-fx-scan shrink-0 [&>svg]:size-[18px]">
          <MagnifyingGlass />
        </span>
        <span className="truncate">Search</span>
        <kbd
          aria-hidden
          className="mp-kbd ml-auto shrink-0 rounded-md px-1.5 py-0.5 font-sans text-[11px] text-ink-muted opacity-0 transition-opacity duration-150 group-hover/search:opacity-100"
        >
          /
        </kbd>
        <span className="sr-only">, shortcut slash</span>
      </Link>

      <Row
        href="/home"
        label="Home"
        icon={<House />}
        active={pathname === "/home"}
        chord="H"
        fx="mp-fx-hop"
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="nav-my-pots"
        // Never highlighted. It is a disclosure, not a destination: the only
        // thing that should look selected is the page you are actually on, and
        // when you are inside a class it is that class in the list below.
        className="mp-fx flex items-center gap-2.5 h-9 px-3 rounded-(--radius-control) text-sm text-ink-muted transition-colors min-w-0 hover:text-ink hover:bg-sunken"
      >
        <span aria-hidden className="mp-fx-stir [&>svg]:size-[18px] shrink-0">
          <CookingPot />
        </span>
        <span className="truncate">My Pots</span>
        <CaretRight
          aria-hidden
          className={cn(
            "ml-auto size-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>

      {/* Grid rows animate to content height without a measured pixel value,
          which keeps the expand smooth whatever the class list holds. The
          global reduced-motion rule removes the transition. */}
      <div
        id="nav-my-pots"
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-0.5 pl-4 pt-1">
            {pots.length === 0 ? (
              <Link
                href="/home"
                className="block px-3 py-1.5 text-[12px] text-ink-faint transition-colors hover:text-ink"
              >
                No classes yet. Join one from Home.
              </Link>
            ) : (
              pots.map((pot, i) => (
                <Link
                  key={pot.id}
                  href={`/p/${pot.id}`}
                  aria-current={
                    pathname.startsWith(`/p/${pot.id}`) ? "page" : undefined
                  }
                  className={cn(
                    "group/pot flex h-9 items-center gap-2 rounded-(--radius-control) px-3 text-[13px] transition-colors min-w-0",
                    pathname.startsWith(`/p/${pot.id}`)
                      ? "bg-primary-soft text-primary font-medium"
                      : "text-ink-muted hover:text-ink hover:bg-sunken",
                  )}
                >
                  <span className="truncate">{pot.title}</span>
                  {i < 9 ? (
                    <>
                      {/* Outlined as glass: see .mp-kbd. Smaller than the
                          class name on purpose, because the outline already
                          gives it enough presence and matching the name would
                          make an annotation look like a second label.

                          Quiet until you are on the row. A column of chords
                          beside every class is noise for the reader who never
                          uses them, and the person who does only needs
                          reminding once. Focus reveals it too, so it is not
                          hidden from a keyboard. */}
                      <kbd
                        aria-hidden
                        className="mp-kbd ml-auto shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 font-sans text-[11px] tabular-nums text-ink-muted opacity-0 transition-opacity duration-150 group-hover/pot:opacity-100 group-focus-visible/pot:opacity-100"
                      >
                        {symbol} + {i + 1}
                      </kbd>
                      <span className="sr-only">
                        , shortcut {mac ? "Command" : "Control"} {i + 1}
                      </span>
                    </>
                  ) : null}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <Row
        href="/study"
        label="Study"
        icon={<GraduationCap />}
        active={pathname.startsWith("/study")}
        chord="S"
        fx="mp-fx-doff"
      />
      <Row
        href="/calendar"
        label="Calendar"
        icon={<CalendarBlank />}
        active={pathname.startsWith("/calendar")}
        chord="C"
        fx="mp-fx-flick"
      />
      <Row
        href="/me/contributions"
        label="Contributions"
        icon={<Notebook />}
        active={pathname.startsWith("/me/contributions")}
        chord="N"
        fx="mp-fx-jot"
      />
    </nav>
  );
}
