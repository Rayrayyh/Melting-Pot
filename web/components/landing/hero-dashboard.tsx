import { Fragment } from "react";
import {
  CalendarBlank,
  CaretDown,
  CookingPot,
  GraduationCap,
  House,
  MagnifyingGlass,
  Notebook,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { PotMark } from "@/components/brand/pot-mark";
import { Avatar } from "@/components/ui/avatar";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionPill, StatusPill } from "@/components/ui/pills";

/**
 * The hero's product shot: a Pot page drawn from the shipped components, so
 * the landing's first claim is the product itself. Everything here is
 * fabricated demo content, and the whole card renders inert and aria-hidden
 * from the landing, so none of it reaches assistive tech or the tab order.
 *
 * The sidebar deliberately shows the My Pots disclosure open with the current
 * class highlighted, exactly as main-nav.tsx renders it. Notifications sit
 * higher than the product's foot-of-rail placement because the hero crops the
 * card before its bottom edge.
 */
export function HeroDashboard() {
  const NAV = [
    { icon: House, label: "Home" },
    { icon: CookingPot, label: "My Pots" },
    { icon: GraduationCap, label: "Study" },
    { icon: CalendarBlank, label: "Calendar" },
    { icon: Notebook, label: "Contributions" },
  ];
  const ENROLLED: [string, string][] = [
    ["Human Biology", "138 notes"],
    ["AP Calculus BC", "64 notes"],
    ["Global", "91 notes"],
    ["Economics", "47 notes"],
    ["US History", "73 notes"],
  ];
  const CONTRIBUTORS: [string, string][] = [
    ["Ava Morgan", "12 notes"],
    ["Omar Reyes", "9 notes"],
    ["Priya Patel", "14 notes"],
    ["Dan Whitfield", "7 notes"],
    ["Lena Fischer", "6 notes"],
    ["Sam Okafor", "5 notes"],
  ];
  const SECTIONS = [
    "All sections",
    "Cell structure",
    "Membrane transport",
    "Cellular respiration",
    "Genetics",
  ];
  const NOTES: [string, string, string, string, string, string | null][] = [
    ["How cells make ATP",
     "The mitochondria produce ATP in stages, and the electron transport chain produces the most by far.",
     "Ava Morgan", "2h ago", "Cellular respiration", "v2"],
    ["Osmosis and tonicity",
     "Water moves toward the higher solute concentration, so a hypertonic surrounding shrinks the cell.",
     "Omar Reyes", "5h ago", "Membrane transport", null],
  ];
  return (
    <div className="w-[1240px] overflow-hidden rounded-[20px] border border-edge-strong bg-surface shadow-(--shadow-hero)">
      <div className="flex">
        <div className="flex w-60 shrink-0 flex-col border-r border-edge bg-surface">
          <div className="p-3">
            <div className="mb-2 flex items-center gap-2 px-1">
              <PotMark className="size-7 shrink-0" idPrefix="mp-hero-card" />
              <span className="font-brand text-[21px] font-semibold lowercase tracking-tight text-ink">
                meltingpot
              </span>
            </div>
            <div className="mb-2 flex h-8 items-center gap-2 rounded-lg border border-edge bg-sunken px-3 text-[14px] text-ink-faint">
              <MagnifyingGlass className="size-3.5" aria-hidden /> Search
            </div>
            {NAV.map(({ icon: Icon, label }) => (
              <Fragment key={label}>
                <div className="mb-0.5 flex h-8 items-center gap-2.5 rounded-lg px-3 text-[14px] text-ink-muted">
                  <Icon className="size-4" aria-hidden />
                  {label}
                  {label === "My Pots" ? (
                    <CaretDown className="ml-auto size-3 text-ink-faint" aria-hidden />
                  ) : null}
                </div>
                {label === "My Pots" ? (
                  /* The shipped nav's disclosure, drawn open. The current
                     class is the highlighted thing, exactly as main-nav.tsx
                     renders it. */
                  <div className="mb-0.5 flex flex-col gap-0.5 pl-4">
                    {ENROLLED.map(([name], i) => (
                      <span
                        key={name}
                        className={`flex h-7 items-center rounded-lg px-3 text-[13px] ${
                          i === 0
                            ? "bg-primary-soft font-medium text-primary"
                            : "text-ink-muted"
                        }`}
                      >
                        <span className="truncate">{name}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </Fragment>
            ))}
          </div>

          {/* In the product these sit at the foot of the rail. Lifted here because
              the hero crops the card before its bottom edge. */}
          <div className="mb-2 px-2">
            <div className="rounded-xl border border-edge bg-sunken p-2">
              <div className="mb-1.5 flex items-center gap-2">
                <StatusPill tone="pending">New</StatusPill>
                <X className="ml-auto size-3 text-ink-faint" aria-hidden />
              </div>
              {[
                ["Membrane transport summ...", "Priya shared a note"],
                ["Osmosis and tonicity", "Priya sent a correction"],
              ].map(([t, d]) => (
                <div key={t} className="flex gap-1.5 py-0.5">
                  <Notebook className="mt-px size-3 shrink-0 text-ink-faint" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] text-ink">{t}</span>
                    <span className="block truncate text-[10px] text-ink-faint">{d}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 border-t border-edge p-2">
            <Avatar name="Maya Chen" size="md" />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium text-ink">Maya Chen</span>
              <span className="block truncate text-[10px] text-ink-faint">maya@meltingpot.io</span>
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 bg-paper">
          {/* Tabs, exactly the set a Pot page carries. */}
          <div className="flex items-center gap-6 border-b border-edge px-7">
            {["Feed", "Study", "Members", "Settings"].map((t, i) => (
              <span
                key={t}
                className={`-mb-px border-b-2 py-3 text-[14px] ${
                  i === 0
                    ? "border-primary font-medium text-primary"
                    : "border-transparent text-ink-muted"
                }`}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mx-auto w-full max-w-4xl space-y-5 px-7 py-5">
            <div>
              <p className="text-[26px] font-semibold tracking-tight text-ink">Human Biology</p>
              <p className="mt-1 text-[14px] text-ink-muted">
                Cell biology through genetics. One place for everything we cover.
              </p>
            </div>

            {/* The four numbers that say a whole class built this, not one person. */}
            <div className="grid grid-cols-4 gap-3">
              <MetricCard label="Contributors" value="24" />
              <MetricCard label="Shared notes" value="138" />
              <MetricCard label="Open corrections" value="2" tone="attention" />
              <MetricCard
                label="Class code"
                value={<span className="font-mono tracking-[0.12em]">BIO4KQ</span>}
              />
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-muted">Recent contributors</p>
              <div className="flex flex-wrap gap-2">
                {CONTRIBUTORS.map(([name, meta]) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface py-1 pl-1 pr-3"
                  >
                    <Avatar name={name} size="sm" />
                    <span className="text-[13px] text-ink">{name}</span>
                    <span className="text-[12px] text-ink-faint">{meta}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((label, i) => (
                <SectionPill key={label} active={i === 0}>
                  {label}
                </SectionPill>
              ))}
            </div>

            {/* Mirrors components/pot/note-card.tsx: title, optional version
                pill, two-line summary, then the attribution row. */}
            <div className="space-y-3">
              {NOTES.map(([title, summary, who, when, section, version]) => (
                <div key={title} className="rounded-(--radius-card) border border-edge bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-1 font-semibold leading-snug text-ink">
                      {title}
                    </span>
                    {version ? <StatusPill tone="primary">{version}</StatusPill> : null}
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{summary}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-[12px] text-ink-muted">
                      <Avatar name={who} size="sm" />
                      <span className="truncate">{who}</span>
                      <span aria-hidden className="text-ink-faint">&middot;</span>
                      <span>{when}</span>
                      <span aria-hidden className="text-ink-faint">&middot;</span>
                      <span>{section}</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-medium text-primary">Open</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
