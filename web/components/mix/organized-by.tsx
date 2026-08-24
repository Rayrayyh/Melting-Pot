import { Sparkle, Warning } from "@phosphor-icons/react/dist/ssr";

/**
 * Says which engine actually wrote a note.
 *
 * There are two of them. The model writes most notes; when it is unreachable
 * or unconfigured, a rule-based organizer finishes the job so a class is never
 * blocked from sharing (`memory/decisions/003`). The two produce visibly
 * different work, and for a while nothing on screen said which one you were
 * looking at. That is a small lie by omission every time the fallback runs,
 * and it is the reason a recorded demo once showed rule-based output while
 * describing what the model does.
 *
 * So the credit is always shown. Named model when the model wrote it, plain
 * warning when it did not.
 */
export function OrganizedBy({ provider }: { provider: string | null }) {
  if (!provider) return null;

  if (provider === "deterministic") {
    return (
      <p className="flex items-start gap-1.5 text-[12px] text-warning">
        <Warning className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>
          The AI organizer was not available, so this was structured by simple
          formatting rules instead. Read it closely before sharing.
        </span>
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-[12px] text-ink-faint">
      <Sparkle className="size-3.5 shrink-0" weight="fill" aria-hidden />
      <span>
        Organized by <span className="text-ink-muted">{provider}</span>
      </span>
    </p>
  );
}
