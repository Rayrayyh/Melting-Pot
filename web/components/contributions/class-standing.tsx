import { standingLines, type Standing } from "@/lib/contributions/stream";

/**
 * Where the person stands in each class, said as what they are ahead of.
 * Only ever their own; a classmate's standing is not readable from here or
 * anywhere else.
 */
export function ClassStanding({ standings, compact = false }: { standings: Standing[]; compact?: boolean }) {
  if (standings.length === 0) return null;
  return (
    <ul className={compact ? "space-y-0.5" : "space-y-2"}>
      {standings.map((s) => {
        const { lead, detail } = standingLines(s);
        return (
          <li key={s.potId}>
            <p className={compact ? "text-[12px] text-ink-muted" : "text-sm font-medium text-ink"}>{lead}</p>
            {compact ? null : <p className="text-[12px] text-ink-muted">{detail}</p>}
          </li>
        );
      })}
    </ul>
  );
}
