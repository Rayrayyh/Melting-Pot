import { diffWords } from "@/lib/diff";
import { cn } from "@/lib/cn";

/** Inline word-level highlights; labels accompany color everywhere. */
export function DiffText({ before, after }: { before: string; after: string }) {
  const segments = diffWords(before, after);
  return (
    // pre-line: body text separates blocks with newlines; keep them visible.
    <p className="text-sm leading-relaxed text-ink whitespace-pre-line">
      {segments.map((segment, i) =>
        segment.type === "same" ? (
          <span key={i}>{segment.text}</span>
        ) : (
          <mark
            key={i}
            className={cn(
              "rounded px-0.5",
              segment.type === "added"
                ? "bg-added-soft text-added no-underline"
                : "bg-removed-soft text-removed line-through decoration-removed/50",
            )}
          >
            {segment.text}
          </mark>
        ),
      )}
    </p>
  );
}

/** Side-by-side Before and After cards with explicit text labels. */
export function BeforeAfter({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="border border-removed/25 bg-removed-soft/30 rounded-(--radius-card) p-4 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-removed">
          {beforeLabel}
        </p>
        <p className="text-sm leading-relaxed text-ink">{before}</p>
      </div>
      <div className="border border-added/25 bg-added-soft/30 rounded-(--radius-card) p-4 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-added">
          {afterLabel}
        </p>
        <p className="text-sm leading-relaxed text-ink">{after}</p>
      </div>
    </div>
  );
}
