"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * A Pot's own surfaces, inside the Pot.
 *
 * The sidebar is account level, so these cannot live there without it becoming
 * a different nav once you step into a class. They belong to the Pot, so they
 * sit on the Pot. Settings is here rather than in the sidebar for the same
 * reason: it is this class's settings, not yours.
 */
export function PotTabs({
  potId,
  role,
  openReviewCount,
}: {
  potId: string;
  role: "member" | "maintainer" | "owner";
  openReviewCount: number;
}) {
  const pathname = usePathname();
  const base = `/p/${potId}`;
  const isMaintainer = role === "maintainer" || role === "owner";

  const tabs = [
    { href: base, label: "Feed", match: (p: string) => p === base || p.startsWith(`${base}/n/`) || p.startsWith(`${base}/s/`) },
    { href: `${base}/study/summary`, label: "Study", match: (p: string) => p.startsWith(`${base}/study`) },
    { href: `${base}/members`, label: "Members", match: (p: string) => p.startsWith(`${base}/members`) },
    ...(isMaintainer
      ? [{ href: `${base}/admin`, label: "Admin", match: (p: string) => p.startsWith(`${base}/admin`), badge: openReviewCount }]
      : []),
    { href: `${base}/settings`, label: "Settings", match: (p: string) => p.startsWith(`${base}/settings`) },
  ];

  return (
    <nav aria-label="This Pot" className="border-b border-edge">
      <div className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-6">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-3 text-[13px] font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
              {"badge" in tab && tab.badge ? (
                <>
                  <span
                    aria-hidden
                    className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-pending-soft px-1.5 text-[11px] font-semibold text-pending"
                  >
                    {tab.badge}
                  </span>
                  <span className="sr-only">, {tab.badge} waiting on review</span>
                </>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
