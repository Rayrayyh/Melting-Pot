import { cn } from "@/lib/cn";

/**
 * Label that rolls on hover: the word lifts out of the top while a copy of it
 * rises into its place. Put `group/roll` on the interactive parent.
 *
 * Pure CSS, so the global prefers-reduced-motion rule flattens it to an
 * instant swap without any extra handling here.
 */
export function RollText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("relative inline-block overflow-hidden align-bottom", className)}>
      <span className="block transition-transform duration-[350ms] ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/roll:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 block translate-y-full transition-transform duration-[350ms] ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/roll:translate-y-0"
      >
        {children}
      </span>
    </span>
  );
}
