import { cn } from "@/lib/cn";

/**
 * A plain spinner for waits of a second or two, where the full-screen stir
 * would be too much and no feedback at all reads as a dead button.
 *
 * It is a ring with one quarter left transparent, so the gap is what shows the
 * rotation. Reduced motion stops the spin and leaves the ring: still a mark
 * that something is happening, without the movement.
 */
export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  /** Announced to screen readers. Pass null on a control that already says it. */
  label?: string | null;
}) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label ?? undefined}
      className={cn(
        "inline-block size-4 shrink-0 rounded-full border-2 border-current border-r-transparent",
        "motion-safe:animate-spin",
        className,
      )}
    />
  );
}
