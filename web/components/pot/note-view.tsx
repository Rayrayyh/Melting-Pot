"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The organized version is the default reading surface; the verbatim
 * original is always one tab away and clearly labeled.
 */
export function NoteView({
  organized,
  rawText,
}: {
  organized: ReactNode;
  rawText: string;
}) {
  const [tab, setTab] = useState<"organized" | "original">("organized");
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Note view" className="inline-flex rounded-(--radius-control) border border-edge bg-sunken p-0.5">
        {(
          [
            { key: "organized", label: "Organized" },
            { key: "original", label: "Original" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "h-8 px-4 rounded-[calc(var(--radius-control)-2px)] text-[13px] font-medium transition-colors",
              tab === key ? "bg-surface text-ink shadow-(--shadow-card)" : "text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "organized" ? (
        organized
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-muted">
            The original submission, exactly as it was written. It is never
            edited or deleted.
          </p>
          <div className="bg-sunken/70 border border-edge rounded-(--radius-card) px-5 py-4">
            <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
              {rawText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
