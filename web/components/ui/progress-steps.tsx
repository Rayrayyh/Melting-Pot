import { Check } from "@phosphor-icons/react/dist/ssr";
import { Stir } from "@/components/brand/stir";
import { cn } from "@/lib/cn";

/** Compact "1 of 3 · Write" style flow indicator with a track. */
export function FlowProgress({
  step,
  total,
  label,
  className,
}: {
  step: number;
  total: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-ink-muted">
          {step} of {total} <span aria-hidden>&middot;</span> {label}
        </span>
      </div>
      <div className="h-1 rounded-full bg-sunken overflow-hidden" role="presentation">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${Math.min(100, (step / total) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export type StageState = "done" | "active" | "waiting";

/** Honest staged checklist used by the organizing state and review timelines. */
export function StageChecklist({
  stages,
  className,
}: {
  stages: Array<{ label: string; detail?: string; state: StageState }>;
  className?: string;
}) {
  return (
    <ol className={cn("space-y-3", className)}>
      {stages.map((stage) => (
        <li key={stage.label} className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 inline-flex size-5 items-center justify-center rounded-full border shrink-0",
              stage.state === "done" && "bg-success-soft border-success/30 text-success",
              stage.state === "active" && "border-primary/40 text-primary",
              stage.state === "waiting" && "border-edge-strong text-transparent",
            )}
          >
            {stage.state === "done" ? (
              <Check weight="bold" className="size-3" />
            ) : stage.state === "active" ? (
              <Stir size={14} />
            ) : null}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-medium",
                stage.state === "waiting" ? "text-ink-faint" : "text-ink",
              )}
            >
              {stage.label}
              {stage.state === "done" ? <span className="sr-only"> (done)</span> : null}
              {stage.state === "active" ? <span className="sr-only"> (in progress)</span> : null}
            </p>
            {stage.detail ? <p className="text-[12px] text-ink-muted">{stage.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
