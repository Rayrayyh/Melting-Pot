"use client";

import { useState } from "react";
import { NoteBody, TakeawaysCard } from "@/components/pot/note-body";
import { DiffText } from "@/components/correct/diff-view";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pills";
import type { NoteHistory, NoteVersion } from "@/lib/data/history";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/cn";

function versionAttribution(version: NoteVersion): string {
  if (version.versionNumber === 1) {
    return `First shared by ${version.contributorName}`;
  }
  const correction = version.correctionContributorName
    ? `Correction by ${version.correctionContributorName}`
    : `Updated by ${version.contributorName}`;
  const review = version.reviewedByName ? ` · approved by ${version.reviewedByName}` : "";
  return `${correction}${review}`;
}

/** Timeline on the left, one readable version on the right. */
export function HistoryView({ history }: { history: NoteHistory }) {
  const [selectedId, setSelectedId] = useState(
    history.versions.find((v) => v.isCurrent)?.id ?? history.versions[0]?.id,
  );
  const selected = history.versions.find((v) => v.id === selectedId);
  const previous = selected
    ? history.versions.find((v) => v.versionNumber === selected.versionNumber - 1)
    : undefined;

  if (!selected) return null;

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
      <aside className="space-y-2 lg:sticky lg:top-20">
        <Eyebrow>Timeline</Eyebrow>
        <ol className="space-y-2">
          {history.versions.map((version) => (
            <li key={version.id}>
              <button
                type="button"
                onClick={() => setSelectedId(version.id)}
                aria-pressed={version.id === selectedId}
                className={cn(
                  "w-full text-left rounded-(--radius-card) border px-4 py-3 transition-colors",
                  version.id === selectedId
                    ? "border-primary/50 bg-primary-soft/60"
                    : "border-edge bg-surface hover:border-edge-strong",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">
                    Version {version.versionNumber}
                  </span>
                  {version.isCurrent ? (
                    <StatusPill tone="success">Current</StatusPill>
                  ) : null}
                </span>
                <span className="block text-[12px] text-ink-muted mt-1 leading-snug">
                  {versionAttribution(version)}
                </span>
                <span className="block text-[12px] text-ink-faint mt-0.5">
                  {relativeTime(version.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="text-[12px] text-ink-faint leading-relaxed pt-1">
          Every version stays visible. Nothing is silently overwritten.
        </p>
      </aside>

      <section className="min-w-0 space-y-4">
        <Card>
          <CardSection className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-edge pb-3">
              <div className="space-y-0.5 min-w-0">
                <p className="font-semibold text-ink">{selected.title}</p>
                <p className="text-[12px] text-ink-muted">
                  {versionAttribution(selected)} &middot; {relativeTime(selected.createdAt)}
                </p>
                {selected.source ? (
                  <p className="text-[12px] text-ink-faint">Source: {selected.source}</p>
                ) : null}
              </div>
              <StatusPill tone={selected.isCurrent ? "success" : "neutral"}>
                {selected.isCurrent ? "Current" : `Version ${selected.versionNumber}`}
              </StatusPill>
            </div>
            <NoteBody blocks={selected.blocks} className="text-[15px]" />
            <TakeawaysCard takeaways={selected.takeaways} />
          </CardSection>
        </Card>

        {previous ? (
          <Card>
            <CardSection className="space-y-2">
              <Eyebrow>Changes from version {previous.versionNumber}</Eyebrow>
              {selected.changeSummary ? (
                <p className="text-[13px] text-ink-muted">{selected.changeSummary}</p>
              ) : null}
              {/* Why the note changed, in the corrector's own words, carried
                  onto the version so a reader does not need permission to see
                  the correction behind it. */}
              {selected.reason ? (
                <p className="text-[13px] text-ink-muted">Reason: {selected.reason}</p>
              ) : null}
              {selected.explanation ? (
                <p className="text-[13px] text-ink-muted">
                  {selected.correctionContributorName
                    ? `${selected.correctionContributorName.split(" ")[0]}'s explanation: `
                    : "Explanation: "}
                  {selected.explanation}
                </p>
              ) : null}
              <div className="overflow-x-auto">
                <DiffText before={previous.bodyText} after={selected.bodyText} />
              </div>
            </CardSection>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
