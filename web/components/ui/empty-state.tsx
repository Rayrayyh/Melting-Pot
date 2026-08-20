import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 py-14 px-6",
        className,
      )}
    >
      {icon ? <div className="text-ink-faint [&>svg]:size-8">{icon}</div> : null}
      <div className="space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        {body ? <p className="text-sm text-ink-muted max-w-sm">{body}</p> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
