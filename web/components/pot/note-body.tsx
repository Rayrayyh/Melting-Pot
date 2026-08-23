import { Fragment } from "react";
import { Lightbulb } from "@phosphor-icons/react/dist/ssr";
import type { NoteBlock } from "@/lib/data/pot";
import { cn } from "@/lib/cn";
import { collectVocabulary, highlightTerms } from "@/lib/vocabulary";

/**
 * Marks the key terms a note defined or emphasised. The terms come from the
 * note itself, so nothing here needs a model and the same note always reads
 * the same way.
 */
function Terms({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  return (
    <>
      {highlightTerms(text, terms).map((run, i) =>
        run.term ? (
          <mark key={i} className="rounded-[3px] bg-clay-soft/70 px-0.5 text-ink">
            {run.text}
          </mark>
        ) : (
          <Fragment key={i}>{run.text}</Fragment>
        ),
      )}
    </>
  );
}

/** Renders organized note blocks on the serif reading surface. */
export function NoteBody({
  blocks,
  className,
  vocabulary = true,
}: {
  blocks: NoteBlock[];
  className?: string;
  /** Highlighting off suits places where the words themselves are the subject. */
  vocabulary?: boolean;
}) {
  const terms = vocabulary ? collectVocabulary(blocks) : [];
  return (
    <div className={cn("font-serif text-[17px] leading-relaxed text-ink space-y-4", className)}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h3 key={i} className="font-sans text-base font-semibold pt-2">
                {block.text}
              </h3>
            );
          case "paragraph":
            return (
              <p key={i}>
                <Terms text={block.text} terms={terms} />
              </p>
            );
          case "bullets":
            return (
              <ul key={i} className="space-y-1.5 pl-5 list-disc marker:text-ink-faint">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Terms text={item} terms={terms} />
                  </li>
                ))}
              </ul>
            );
          case "definition":
            return (
              <div
                key={i}
                className="border-l-2 border-primary/40 bg-primary-soft/40 rounded-r-lg px-4 py-3"
              >
                <p>
                  <span className="font-sans text-[13px] font-semibold uppercase tracking-wide text-primary block mb-1">
                    {block.term}
                  </span>
                  {/* The term is already the heading here, so the body is not
                      marked up again with its own name. */}
                  <Terms text={block.text} terms={terms.filter((term) => term !== block.term)} />
                </p>
              </div>
            );
          case "example":
            return (
              <div key={i} className="border border-edge rounded-lg px-4 py-3 bg-sunken/60">
                <p>
                  <span className="font-sans text-[13px] font-semibold uppercase tracking-wide text-ink-faint block mb-1">
                    Example
                  </span>
                  <Terms text={block.text} terms={terms} />
                </p>
              </div>
            );
        }
      })}
    </div>
  );
}

export function TakeawaysCard({ takeaways }: { takeaways: string[] }) {
  if (takeaways.length === 0) return null;
  return (
    <div className="bg-clay-soft/50 border border-clay/20 rounded-(--radius-card) px-5 py-4">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-clay mb-2">
        <Lightbulb className="size-4" aria-hidden />
        Key takeaways
      </p>
      <ul className="space-y-1.5">
        {takeaways.map((takeaway, i) => (
          <li key={i} className="text-sm text-ink leading-relaxed">
            {takeaway}
          </li>
        ))}
      </ul>
    </div>
  );
}
