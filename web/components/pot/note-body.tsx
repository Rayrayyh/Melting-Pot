import { Lightbulb } from "@phosphor-icons/react/dist/ssr";
import type { NoteBlock } from "@/lib/data/pot";
import { cn } from "@/lib/cn";

/** Renders organized note blocks on the serif reading surface. */
export function NoteBody({
  blocks,
  className,
}: {
  blocks: NoteBlock[];
  className?: string;
}) {
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
            return <p key={i}>{block.text}</p>;
          case "bullets":
            return (
              <ul key={i} className="space-y-1.5 pl-5 list-disc marker:text-ink-faint">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
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
                  {block.text}
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
                  {block.text}
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
