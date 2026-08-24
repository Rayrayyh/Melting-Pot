"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChatCircleText,
  GearSix,
  House,
  Notebook,
  Plus,
  ShieldCheck,
  SignIn,
  Users,
} from "@phosphor-icons/react";
import type { PotRole } from "@/components/ui/pills";
import { cn } from "@/lib/cn";

function NavLink({
  href,
  label,
  icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 h-9 px-3 rounded-(--radius-control) text-sm transition-colors min-w-0",
        active
          ? "bg-primary-soft text-primary font-medium"
          : "text-ink-muted hover:text-ink hover:bg-sunken",
      )}
    >
      {icon ? <span aria-hidden className="[&>svg]:size-[18px] shrink-0">{icon}</span> : null}
      <span className="truncate">{label}</span>
      {badge && badge > 0 ? (
        <>
          {/* The number alone made the link read as "Admin 1", which says
              nothing about what the one is. The digit is decorative and the
              sentence beside it is what a screen reader gets. */}
          <span
            aria-hidden
            className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pending-soft px-1.5 text-[11px] font-semibold text-pending"
          >
            {badge}
          </span>
          <span className="sr-only">
            , {badge} waiting on review
          </span>
        </>
      ) : null}
    </Link>
  );
}

export type UserNavPot = { id: string; title: string };

/** User-level navigation: dashboard, pots, join, create. */
export function UserNav({ pots }: { pots: UserNavPot[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 p-3">
      <NavLink href="/home" label="Home" icon={<House />} active={pathname === "/home"} />
      <NavLink
        href="/me/contributions"
        label="Contributions"
        icon={<Notebook />}
        active={pathname.startsWith("/me/contributions")}
      />
      {pots.length > 0 ? (
        <div className="mt-4">
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
            My Pots
          </p>
          <div className="flex flex-col gap-0.5">
            {pots.map((pot) => (
              <NavLink
                key={pot.id}
                href={`/p/${pot.id}`}
                label={pot.title}
                active={pathname.startsWith(`/p/${pot.id}`)}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex flex-col gap-0.5">
        <NavLink
          href="/join"
          label="Join a Pot"
          icon={<SignIn />}
          active={pathname === "/join"}
        />
        <NavLink
          href="/pots/new"
          label="Create a Pot"
          icon={<Plus />}
          active={pathname === "/pots/new"}
        />
      </div>
      {/* Settings sits last, where a sidebar is expected to keep it. It was
          reachable only through the account popover, which is a place you have
          to already know about.

          "Account settings" rather than "Settings" because a Pot has settings
          of its own, one nav across from this one, and two links a click apart
          both called Settings is a coin toss for the reader. */}
      <div className="mt-auto pt-4">
        <NavLink
          href="/me/settings"
          label="Account settings"
          icon={<GearSix />}
          active={pathname.startsWith("/me/settings")}
        />
      </div>
    </nav>
  );
}

export type PotNavSection = { id: string; title: string };

/** Pot-level navigation: back link, pot header, sections, fixed entries. */
export function PotNav({
  potId,
  potTitle,
  memberCount,
  sections,
  role,
  openReviewCount = 0,
  archived = false,
}: {
  potId: string;
  potTitle: string;
  memberCount: number;
  sections: PotNavSection[];
  role: PotRole;
  openReviewCount?: number;
  archived?: boolean;
}) {
  const pathname = usePathname();
  const base = `/p/${potId}`;
  const isMaintainer = role === "maintainer" || role === "owner";
  return (
    <nav aria-label="Pot" className="flex flex-col gap-0.5 p-3">
      <Link
        href="/home"
        className="flex items-center gap-2 h-8 px-3 text-[13px] text-ink-faint hover:text-ink transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        All Pots
      </Link>
      <div className="px-3 pt-1 pb-3">
        <p className="font-semibold text-ink leading-snug">{potTitle}</p>
        <p className="text-[12px] text-ink-muted mt-0.5">
          {memberCount} {memberCount === 1 ? "member" : "members"}
          {archived ? " · archived" : ""}
        </p>
      </div>
      {archived ? (
        <p className="mx-3 mb-3 rounded-(--radius-control) border border-edge bg-sunken px-3 py-2 text-[12px] text-ink-muted">
          Archived: readable, closed to new notes.
        </p>
      ) : (
        <Link
          href={`${base}/contribute`}
          className="mx-3 mb-3 inline-flex h-10 items-center justify-center gap-2 rounded-(--radius-control) bg-primary text-on-primary text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          <Plus className="size-4" />
          Add contribution
        </Link>
      )}
      <NavLink
        href={base}
        label="Feed"
        icon={<ChatCircleText />}
        active={pathname === base}
      />
      {isMaintainer ? (
        <NavLink
          href={`${base}/admin`}
          label="Admin"
          icon={<ShieldCheck />}
          // The decision surface still lives under /review, so a maintainer
          // reading one correction is still inside the section they came from.
          active={
            pathname.startsWith(`${base}/admin`) || pathname.startsWith(`${base}/review`)
          }
          badge={openReviewCount}
        />
      ) : null}
      <NavLink
        href={`${base}/members`}
        label="Members"
        icon={<Users />}
        active={pathname.startsWith(`${base}/members`)}
      />
      <NavLink
        href={`${base}/settings`}
        label="Settings"
        icon={<GearSix />}
        active={pathname.startsWith(`${base}/settings`)}
      />
      {sections.length > 0 ? (
        <div className="mt-4">
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
            Sections
          </p>
          <div className="flex flex-col gap-0.5">
            {sections.map((section) => (
              <NavLink
                key={section.id}
                href={`${base}/s/${section.id}`}
                label={section.title}
                active={pathname === `${base}/s/${section.id}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
