import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Bottom-pinned bar for flow steps: a reassurance line at the left and
 * actions at the right. Content above it should get bottom padding.
 */
export function StickyActionBar({
  message,
  icon,
  children,
  className,
}: {
  message?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 border-t border-edge bg-surface/95 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex items-center gap-2 text-[13px] text-ink-muted min-w-0">
          {icon ? <span aria-hidden className="[&>svg]:size-4 shrink-0">{icon}</span> : null}
          {message ? <span className="truncate">{message}</span> : null}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">{children}</div>
      </div>
    </div>
  );
}
