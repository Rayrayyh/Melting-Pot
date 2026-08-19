import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet" | "danger" | "clay";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-(--radius-control) transition-colors duration-150 select-none disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover active:bg-(--primary-active)",
  secondary:
    "border border-edge-strong bg-surface text-ink hover:bg-sunken active:bg-sunken",
  quiet: "text-ink-muted hover:text-ink hover:bg-sunken",
  danger: "bg-danger text-(--danger-soft) hover:opacity-90",
  clay: "bg-clay text-on-clay hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "children"> &
  Pick<ComponentProps<"a">, "target" | "rel">;

export function Button({
  variant = "primary",
  size = "md",
  href,
  className,
  children,
  target,
  rel,
  type,
  ...rest
}: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);
  if (href) {
    return (
      <Link href={href} target={target} rel={rel} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} className={classes} {...rest}>
      {children}
    </button>
  );
}
