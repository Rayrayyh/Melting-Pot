import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "primary";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-sunken border-edge text-ink",
  success: "bg-success-soft border-success/25 text-ink",
  warning: "bg-warning-soft border-warning/25 text-ink",
  danger: "bg-danger-soft border-danger/25 text-ink",
  primary: "bg-primary-soft border-primary/25 text-ink",
};

/** Inline banner for outcomes, boundaries, and reassurance lines. */
export function NoticeBanner({
  tone = "neutral",
  icon,
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 border rounded-(--radius-card) px-4 py-3.5",
        toneStyles[tone],
        className,
      )}
    >
      {icon ? <div className="mt-0.5 shrink-0 [&>svg]:size-5">{icon}</div> : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        {children ? <div className="text-sm text-ink-muted">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
