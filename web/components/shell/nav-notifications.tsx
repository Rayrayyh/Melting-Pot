"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { CheckCircle, Notebook, PencilSimpleLine, X } from "@phosphor-icons/react";
import type { Notification } from "@/lib/data/notifications";

/**
 * What is waiting on you, pinned above the account control.
 *
 * It sits outside the scrolling nav on purpose: a correction addressed to you
 * should not be something you have to scroll a class list to discover. Three
 * items is the cap, because a sidebar panel that grows without limit starts
 * competing with the navigation it is sitting under.
 */

const KEY = "mp:notifications-dismissed";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** Private browsing and blocked site data both throw here rather than
 *  returning null, so every read and write is guarded. */
function readDismissed() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function dismiss(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* Nothing to persist to. The panel still closes for this render. */
  }
  for (const l of listeners) l();
}

const ICONS = {
  review: PencilSimpleLine,
  decision: CheckCircle,
  note: Notebook,
} as const;

export function NavNotifications({ items }: { items: Notification[] }) {
  // Keyed on the newest item, so dismissing clears what you have seen without
  // muting the next thing that happens.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => null);

  if (items.length === 0) {
    return (
      <div className="mb-2 px-2">
        <div className="rounded-(--radius-card) border border-edge bg-sunken px-3 py-2.5">
          <p className="text-[12px] text-ink-muted">You are all caught up</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            Corrections and new class notes land here.
          </p>
        </div>
      </div>
    );
  }

  const top = items[0].id;
  if (dismissed === top) return null;

  const unread = items.filter((n) => n.isNew).length;

  return (
    <div className="mb-2 px-2">
      <section
        aria-label="Notifications"
        className="rounded-(--radius-card) border border-edge bg-sunken p-2.5"
      >
        <div className="flex items-center gap-2">
          {unread > 0 ? (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
              New
            </span>
          ) : (
            <span className="text-[11px] font-medium text-ink-muted">Notifications</span>
          )}
          <button
            type="button"
            onClick={() => dismiss(top)}
            aria-label="Dismiss notifications"
            className="ml-auto -me-1 inline-flex size-6 items-center justify-center rounded-(--radius-control) text-ink-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </div>

        <ul className="mt-1.5 flex flex-col">
          {items.map((n) => {
            const Icon = ICONS[n.kind];
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  className="group/n flex gap-2 rounded-(--radius-control) px-1.5 py-1.5 transition-colors hover:bg-surface"
                >
                  <Icon
                    aria-hidden
                    className="mt-px size-3.5 shrink-0 text-ink-faint transition-colors group-hover/n:text-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] text-ink">{n.title}</span>
                    {/* Three lines, three weights of attention: what it is,
                        who did it, where and when. Flattening the last two
                        into one colour turned the row into a paragraph. */}
                    <span className="block truncate text-[11px] text-ink-muted">{n.detail}</span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      {n.potTitle} · {n.atLabel}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
