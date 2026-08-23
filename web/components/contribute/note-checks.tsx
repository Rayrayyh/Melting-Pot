import { Warning } from "@phosphor-icons/react/dist/ssr";
import type { NoteCheck } from "@/lib/mix/contracts";

/**
 * Claims the mixer thinks are wrong, shown to the person who wrote them
 * before the class reads them.
 *
 * It sits beside the note rather than inside it, and nothing here has touched
 * the writing. That separation is the point: tidying a wrong claim into clean
 * prose is the worst thing an organizer can do to a study note, because a
 * confident-looking error is the one that gets revised from and memorised.
 * Saying so and leaving the words alone puts the decision back on a person,
 * which is where every other change in this app already sits.
 *
 * Nothing is blocked. A writer who disagrees can share anyway, and the
 * correction loop is there for whoever reads it next.
 */
export function NoteChecks({ checks }: { checks: NoteCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <section
      aria-label="Worth checking"
      className="rounded-(--radius-card) border border-warning/30 bg-warning-soft/40 px-5 py-4 space-y-3"
    >
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-warning">
        <Warning className="size-4" aria-hidden />
        Worth checking before you share
      </p>
      <ul className="space-y-2.5">
        {checks.map((check, i) => (
          <li key={i} className="space-y-0.5">
            <p className="text-[13px] text-ink">&ldquo;{check.claim}&rdquo;</p>
            <p className="text-[13px] text-ink-muted">{check.concern}</p>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-ink-faint">
        Your note has not been changed. Edit it above if you agree, or share it
        as it is.
      </p>
    </section>
  );
}
