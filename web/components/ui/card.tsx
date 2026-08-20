import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-surface border border-edge rounded-(--radius-card) shadow-(--shadow-card)",
        className,
      )}
      {...rest}
    />
  );
}

export function CardSection({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...rest} />;
}

/** Muted small-caps label used above values, form groups, and card headers. */
export function Eyebrow({ className, ...rest }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint",
        className,
      )}
      {...rest}
    />
  );
}
