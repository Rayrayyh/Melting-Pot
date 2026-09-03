import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { RollText } from "@/components/ui/roll-text";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet" | "danger" | "clay";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-150 select-none disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover active:bg-(--primary-active)",
  secondary:
    "border border-edge-strong bg-surface text-ink hover:bg-sunken active:bg-edge",
  // Four states each, per R38: default, hover, pressed, disabled. The last is
  // on the base class; the pressed state was missing on these three, so a
  // click on a destructive button gave no feedback at all.
  quiet: "text-ink-muted hover:text-ink hover:bg-sunken active:bg-edge",
  danger: "bg-danger text-(--danger-soft) hover:opacity-90 active:opacity-80",
  clay: "bg-clay text-on-clay hover:opacity-90 active:opacity-80",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  href?: string;
  /** Roll the label on hover. Text-only labels; reserved for calls to action. */
  roll?: boolean;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "children"> &
  Pick<ComponentProps<"a">, "target" | "rel">;

export function Button({
  variant = "primary",
  size = "md",
  href,
  roll = false,
  className,
  children,
  target,
  rel,
  type,
  ...rest
}: ButtonProps) {
  const rolling = roll && typeof children === "string";
  const classes = cn(base, variants[variant], sizes[size], rolling && "group/roll", className);
  const label = rolling ? <RollText>{children as string}</RollText> : children;
  if (href) {
    return (
      <Link href={href} target={target} rel={rel} className={classes}>
        {label}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} className={classes} {...rest}>
      {label}
    </button>
  );
}
